import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, rapidFireTopics } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { chat } from "@/lib/llm";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transcript, inputMethod } = await request.json();
  if (!transcript || transcript.length < 20) {
    return NextResponse.json(
      { error: "Please tell us more (at least a few sentences)" },
      { status: 400 }
    );
  }

  await db
    .update(userProfiles)
    .set({
      conversationTranscript: transcript,
      conversationInputMethod: inputMethod || "text",
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, session.user.id));

  // Fire off LLM parsing in the background — extract topics for rapid-fire
  parseTranscriptAsync(session.user.id, transcript).catch(console.error);

  return NextResponse.json({ ok: true });
}

async function parseTranscriptAsync(userId: string, transcript: string) {
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

  try {
    const parsed = JSON.parse(response.content);

    await db
      .update(userProfiles)
      .set({
        parsedInitiatives: parsed.initiatives || [],
        parsedConcerns: parsed.concerns || [],
        parsedTopics: parsed.topics || [],
        parsedKnowledgeGaps: parsed.knowledgeGaps || [],
        parsedExpertAreas: parsed.expertAreas || [],
        parsedWeakAreas: parsed.weakAreas || [],
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));

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
    } else {
      await db.insert(rapidFireTopics).values({
        userId,
        topics: parsed.rapidFireTopics || [],
        ready: true,
      });
    }
  } catch (e) {
    console.error("Failed to parse LLM response:", e);
  }
}
