import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedbackSignals, knowledgeEntities } from "@/lib/schema";
import { embed } from "@/lib/llm";
import { maybeRegenerateFromFeedback } from "@/lib/content-universe";
import { isEntitySuppressed } from "@/lib/knowledge-prune";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { briefingId, itemId, topic } = await request.json();

  await db.insert(feedbackSignals).values({
    userId: session.user.id,
    briefingId,
    briefingItemId: itemId,
    type: "not-novel",
    topic,
  });

  if (topic) {
    try {
      const suppressed = await isEntitySuppressed(session.user.id, topic, "concept");
      if (!suppressed) {
        const embeddings = await embed([topic]);
        await db
          .insert(knowledgeEntities)
          .values({
            userId: session.user.id,
            entityType: "concept",
            name: topic,
            source: "feedback-implicit",
            confidence: 1.0,
            embedding: embeddings[0] || null,
          })
          .onConflictDoNothing();
      }
    } catch {
      // Non-critical
    }
  }

  maybeRegenerateFromFeedback(session.user.id).catch((err) =>
    console.error("Content universe feedback regen failed (non-critical)", err)
  );

  return NextResponse.json({ ok: true });
}
