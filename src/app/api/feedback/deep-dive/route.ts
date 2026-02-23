import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedbackSignals } from "@/lib/schema";
import { chat } from "@/lib/llm";

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

  const response = await chat([
    {
      role: "system",
      content:
        "Provide a 3-4 sentence deeper explanation. Factual, dry tone, no fluff. Include relevant context, numbers, or implications.",
    },
    {
      role: "user",
      content: `Expand on this briefing item: "${topic}". Original: "${content}"`,
    },
  ], { model: "gpt-4o-mini", temperature: 0.5 });

  return NextResponse.json({ expanded: response.content });
}
