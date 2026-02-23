import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedbackSignals, users, userProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { chat } from "@/lib/llm";
import { searchPerplexity } from "@/lib/ai-research";
import { toStringArray } from "@/lib/safe-parse";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { briefingId, itemId, topic, content } = await request.json();

  await db.insert(feedbackSignals).values({
    userId: session.user.id,
    briefingId,
    briefingItemId: itemId,
    type: "deep-dive",
    topic,
  });

  // Try Perplexity for grounded, cited research
  if (process.env.PERPLEXITY_API_KEY) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    const role = user?.title || "professional";
    const company = user?.company || "a company";
    const initiatives = profile ? toStringArray(profile.parsedInitiatives) : [];
    const initiativeContext =
      initiatives.length > 0
        ? ` Their current initiatives include: ${initiatives.join(", ")}.`
        : "";

    const systemContext = `You are a research assistant for a ${role} at ${company}.${initiativeContext} Provide a detailed, factual deep-dive. Include specific numbers, dates, and context. Cite sources where possible.`;

    const result = await searchPerplexity(
      `Expand on this: "${topic}". Context: "${content}". Provide deeper analysis, background, related developments, and implications.`,
      systemContext
    );

    if (result?.content) {
      return NextResponse.json({ expanded: result.content });
    }
  }

  // Fallback to LLM
  const response = await chat(
    [
      {
        role: "system",
        content:
          "Provide a 3-4 sentence deeper explanation. Factual, dry tone, no fluff. Include relevant context, numbers, or implications.",
      },
      {
        role: "user",
        content: `Expand on this briefing item: "${topic}". Original: "${content}"`,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.5 }
  );

  return NextResponse.json({ expanded: response.content });
}
