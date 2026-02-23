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
import { createLogger } from "@/lib/logger";

const log = createLogger("onboarding:complete");

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const ulog = log.child({ userId });
  const start = Date.now();

  ulog.info("Onboarding complete — starting post-onboarding pipeline");

  await db
    .update(users)
    .set({ onboardingStatus: "completed" })
    .where(eq(users.id, userId));

  try {
    ulog.info("Seeding knowledge graph");
    await seedKnowledgeGraph(userId);
    ulog.info({ elapsed: Date.now() - start }, "Knowledge graph seeded");

    try {
      ulog.info("Deriving news queries");
      await deriveNewsQueries(userId);

      ulog.info("Deriving syndication feeds");
      await deriveFeedsForUser(userId);
      await smartDiscoverFeeds(userId);

      ulog.info("Running initial ingestion (news poll + AI research)");
      const ingestionStart = Date.now();

      await Promise.all([
        pollNewsQueries(crypto.randomUUID()).catch((e) =>
          ulog.error({ err: e }, "Initial news poll failed (non-critical)")
        ),
        runAiResearch(userId).catch((e) =>
          ulog.error({ err: e }, "Initial AI research failed (non-critical)")
        ),
      ]);

      ulog.info({ ingestionMs: Date.now() - ingestionStart }, "Initial ingestion complete");
    } catch (e) {
      ulog.error({ err: e, elapsed: Date.now() - start }, "Initial ingestion failed (non-critical) — continuing to pipeline");
    }

    ulog.info("Running pipeline");
    const briefingId = await runPipeline(userId);
    ulog.info({ briefingId, totalMs: Date.now() - start }, "Post-onboarding pipeline completed");
    return NextResponse.json({ ok: true, briefingId });
  } catch (e) {
    ulog.error({ err: e, totalMs: Date.now() - start }, "Post-onboarding pipeline FAILED");
    return NextResponse.json({ ok: true, briefingId: null });
  }
}
