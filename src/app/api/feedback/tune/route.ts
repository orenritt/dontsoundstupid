import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedbackSignals } from "@/lib/schema";
import { maybeRegenerateFromFeedback } from "@/lib/content-universe";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { briefingId, itemId, direction, topic } = await request.json();

  await db.insert(feedbackSignals).values({
    userId: session.user.id,
    briefingId,
    briefingItemId: itemId,
    type: direction === "up" ? "more-like-this" : "less-like-this",
    topic,
  });

  maybeRegenerateFromFeedback(session.user.id).catch((err) =>
    console.error("Content universe feedback regen failed (non-critical)", err)
  );

  return NextResponse.json({ ok: true });
}
