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
import { generateContentUniverse } from "@/lib/content-universe";
import { updatePipelineStatus } from "@/lib/pipeline-status";
import { createLogger } from "@/lib/logger";

const log = createLogger("onboarding:complete");

async function runPostOnboardingPipeline(userId: string) {
  const ulog = log.child({ userId });
  const start = Date.now();

  try {
    updatePipelineStatus(userId, "loading-profile");

    generateContentUniverse(userId).catch((err) =>
      ulog.error({ err }, "Content universe generation failed (non-critical)")
    );

    ulog.info("Seeding knowledge graph");
    await seedKnowledgeGraph(userId);
    ulog.info({ elapsed: Date.now() - start }, "Knowledge graph seeded");

    try {
      updatePipelineStatus(userId, "ingesting-news");
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
  } catch (e) {
    ulog.error({ err: e, totalMs: Date.now() - start }, "Post-onboarding pipeline FAILED");
    updatePipelineStatus(userId, "failed", {
      error: e instanceof Error ? e.message : "Pipeline failed",
    });
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const ulog = log.child({ userId });

  ulog.info("Onboarding complete — marking user and starting background pipeline");

  await db
    .update(users)
    .set({ onboardingStatus: "completed" })
    .where(eq(users.id, userId));

  updatePipelineStatus(userId, "starting");

  // Fire and forget — client polls /api/pipeline/status for progress
  runPostOnboardingPipeline(userId).catch((err) => {
    ulog.error({ err }, "Background pipeline crashed unexpectedly");
    updatePipelineStatus(userId, "failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  });

  return NextResponse.json({ ok: true });
}
