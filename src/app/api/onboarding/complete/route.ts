import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { seedKnowledgeGraph } from "@/lib/knowledge-seed";
import { runPipeline } from "@/lib/pipeline";
import { smartDiscoverFeeds, deriveFeedsForUser } from "@/lib/syndication";
import { deriveNewsQueries, pollNewsQueries } from "@/lib/news-ingestion";
import { runAiResearch } from "@/lib/ai-research";

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  await db
    .update(users)
    .set({ onboardingStatus: "completed" })
    .where(eq(users.id, userId));

  try {
    await seedKnowledgeGraph(userId);

    // Run initial ingestion to populate signals table before first briefing
    try {
      await deriveNewsQueries(userId);
      await deriveFeedsForUser(userId);
      await smartDiscoverFeeds(userId);

      await Promise.all([
        pollNewsQueries(crypto.randomUUID()).catch((e) =>
          console.error("Initial news poll failed (non-critical):", e)
        ),
        runAiResearch(userId).catch((e) =>
          console.error("Initial AI research failed (non-critical):", e)
        ),
      ]);
    } catch (e) {
      console.error("Initial ingestion failed (non-critical):", e);
    }

    const briefingId = await runPipeline(userId);
    return NextResponse.json({ ok: true, briefingId });
  } catch (e) {
    console.error("Post-onboarding pipeline failed:", e);
    return NextResponse.json({ ok: true, briefingId: null });
  }
}
