import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, rapidFireTopics } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { chat } from "@/lib/llm";
import { toStringArray } from "@/lib/safe-parse";
import { createLogger } from "@/lib/logger";

const log = createLogger("onboarding:conversation");

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const ulog = log.child({ userId });

  const { transcript, inputMethod } = await request.json();
  if (!transcript || transcript.length < 20) {
    ulog.warn({ transcriptLength: transcript?.length ?? 0 }, "Transcript too short");
    return NextResponse.json(
      { error: "Please tell us more (at least a few sentences)" },
      { status: 400 }
    );
  }

  ulog.info({ inputMethod: inputMethod || "text", transcriptLength: transcript.length }, "Saving conversation transcript");

  await db
    .update(userProfiles)
    .set({
      conversationTranscript: transcript,
      conversationInputMethod: inputMethod || "text",
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));

  ulog.info("Transcript saved, firing parseTranscriptAsync in background");

  parseTranscriptAsync(userId, transcript).catch((err) => {
    ulog.error({ err, transcriptLength: transcript.length }, "parseTranscriptAsync failed — user will be stuck on 'Analyzing' screen");
  });

  return NextResponse.json({ ok: true });
}

async function parseTranscriptAsync(userId: string, transcript: string) {
  const ulog = log.child({ userId, op: "parseTranscript" });
  const start = Date.now();

  ulog.info({ transcriptLength: transcript.length }, "Starting transcript parsing via LLM");

  const response = await chat([
    {
      role: "system",
      content: `You are an expert at understanding professional context from natural language.
Given a user's description of their work, extract:
1. initiatives: what they're working on
2. concerns: challenges they face
3. topics: areas they need to stay sharp on
4. knowledgeGaps: things they wish they knew more about
5. expertAreas: things they're confident about
6. weakAreas: things they explicitly lack knowledge in
7. rapidFireTopics: 8-15 topics/entities to present for quick classification, each with a one-line context

Return valid JSON with these exact keys. rapidFireTopics should be an array of {topic, context} objects.`,
    },
    {
      role: "user",
      content: transcript,
    },
  ], { model: "gpt-4o-mini", temperature: 0.3 });

  const llmMs = Date.now() - start;
  ulog.info({ llmMs, responseLength: response.content.length, promptTokens: response.promptTokens, completionTokens: response.completionTokens }, "LLM response received");

  try {
    let raw = response.content.trim();
    const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch?.[1]) raw = fenceMatch[1].trim();
    const parsed = JSON.parse(raw);

    const topicCount = Array.isArray(parsed.rapidFireTopics) ? parsed.rapidFireTopics.length : 0;
    ulog.info({
      initiatives: toStringArray(parsed.initiatives).length,
      concerns: toStringArray(parsed.concerns).length,
      topics: toStringArray(parsed.topics).length,
      knowledgeGaps: toStringArray(parsed.knowledgeGaps).length,
      rapidFireTopicCount: topicCount,
    }, "Parsed transcript successfully");

    await db
      .update(userProfiles)
      .set({
        parsedInitiatives: toStringArray(parsed.initiatives),
        parsedConcerns: toStringArray(parsed.concerns),
        parsedTopics: toStringArray(parsed.topics),
        parsedKnowledgeGaps: toStringArray(parsed.knowledgeGaps),
        parsedExpertAreas: toStringArray(parsed.expertAreas),
        parsedWeakAreas: toStringArray(parsed.weakAreas),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));

    ulog.info("Updated user profile with parsed data");

    const existingTopics = await db
      .select({ id: rapidFireTopics.id })
      .from(rapidFireTopics)
      .where(eq(rapidFireTopics.userId, userId))
      .limit(1);

    if (existingTopics.length > 0) {
      await db
        .update(rapidFireTopics)
        .set({
          topics: parsed.rapidFireTopics || [],
          ready: true,
        })
        .where(eq(rapidFireTopics.userId, userId));
      ulog.info({ topicCount }, "Updated existing rapid-fire topics row → ready=true");
    } else {
      await db.insert(rapidFireTopics).values({
        userId,
        topics: parsed.rapidFireTopics || [],
        ready: true,
      });
      ulog.info({ topicCount }, "Inserted new rapid-fire topics row → ready=true");
    }

    const totalMs = Date.now() - start;
    ulog.info({ totalMs }, "parseTranscriptAsync completed successfully");
  } catch (e) {
    const totalMs = Date.now() - start;
    ulog.error({ err: e, totalMs, rawResponseSnippet: response.content.slice(0, 500) }, "Failed to parse LLM response — rapid-fire topics will NOT be ready");
    throw e;
  }
}
