import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userProfiles, signals, signalProvenance } from "@/lib/schema";
import { eq, sql, gte, inArray, and } from "drizzle-orm";
import { deriveNewsQueries, pollNewsQueries, refreshQueriesForUser } from "@/lib/news-ingestion";
import { deriveFeedsForUser, pollSyndicationFeeds } from "@/lib/syndication";
import { runAiResearch } from "@/lib/ai-research";
import { pruneKnowledgeGraph } from "@/lib/knowledge-prune";
import { runScoringAgent, DEFAULT_AGENT_CONFIG } from "@/lib/scoring-agent";
import { toStringArray } from "@/lib/safe-parse";
import type { ContentUniverse } from "@/models/content-universe";

const ADMIN_EMAIL = "orenrittenberg@gmail.com";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const rows = await db.execute(
    sql`SELECT email FROM users WHERE id = ${session.user.id} LIMIT 1`
  );
  const userRows = rows as unknown as { email: string }[];
  if (!userRows[0] || userRows[0].email !== ADMIN_EMAIL) return null;
  return session.user.id;
}

interface StageResult {
  stage: string;
  status: "pass" | "warn" | "fail";
  durationMs: number;
  details: Record<string, unknown>;
}

export async function POST() {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db
    .select({ id: users.id, email: users.email, name: users.name, title: users.title, company: users.company })
    .from(users)
    .where(eq(users.onboardingStatus, "completed"));

  const results: { userId: string; email: string | null; stages: StageResult[] }[] = [];

  for (const user of allUsers) {
    const stages: StageResult[] = [];

    // 1. Profile — load and validate
    let start = Date.now();
    let hasProfile = false;
    try {
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
      if (!profile) {
        stages.push({ stage: "profile", status: "fail", durationMs: Date.now() - start, details: { error: "No profile found" } });
      } else {
        hasProfile = true;
        const contentUniverse = (profile as Record<string, unknown>).contentUniverse as ContentUniverse | null;
        const topics = toStringArray(profile.parsedTopics);
        stages.push({
          stage: "profile",
          status: topics.length === 0 ? "warn" : "pass",
          durationMs: Date.now() - start,
          details: {
            topics: topics.length,
            initiatives: toStringArray(profile.parsedInitiatives).length,
            concerns: toStringArray(profile.parsedConcerns).length,
            hasContentUniverse: !!contentUniverse,
            coreTopics: contentUniverse?.coreTopics?.length ?? 0,
            exclusions: contentUniverse?.exclusions?.length ?? 0,
            ...(topics.length === 0 ? { warning: "No parsed topics" } : {}),
          },
        });
      }
    } catch (err) {
      stages.push({ stage: "profile", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    if (!hasProfile) {
      results.push({ userId: user.id, email: user.email, stages });
      continue;
    }

    // 2. News query derivation — LIVE: derives queries from profile
    start = Date.now();
    try {
      await deriveNewsQueries(user.id);
      const refreshed = await refreshQueriesForUser(user.id);
      stages.push({
        stage: "query-derivation",
        status: "pass",
        durationMs: Date.now() - start,
        details: { refreshedQueries: refreshed },
      });
    } catch (err) {
      stages.push({ stage: "query-derivation", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 3. News polling — LIVE: hits NewsAPI.ai
    start = Date.now();
    try {
      const newsResult = await pollNewsQueries(crypto.randomUUID());
      stages.push({
        stage: "news-ingestion",
        status: newsResult.signals.length === 0 && newsResult.errorsEncounted > 0 ? "fail" : newsResult.signals.length === 0 ? "warn" : "pass",
        durationMs: Date.now() - start,
        details: {
          queriesPolled: newsResult.queriesPolled,
          articlesFound: newsResult.articlesFound,
          filteredOut: newsResult.filteredOut,
          signalsCreated: newsResult.signals.length,
          errors: newsResult.errorsEncounted,
          ...(newsResult.signals.length === 0 ? { warning: "No news signals ingested" } : {}),
        },
      });
    } catch (err) {
      stages.push({ stage: "news-ingestion", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 4. Syndication — LIVE: polls RSS feeds
    start = Date.now();
    try {
      await deriveFeedsForUser(user.id);
      const synResult = await pollSyndicationFeeds();
      stages.push({
        stage: "syndication",
        status: "pass",
        durationMs: Date.now() - start,
        details: {
          feedsPolled: synResult.feedsPolled,
          newItems: synResult.newItems,
          errors: synResult.errors,
        },
      });
    } catch (err) {
      stages.push({ stage: "syndication", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 5. AI Research — LIVE: hits Perplexity + Tavily
    start = Date.now();
    try {
      const aiSignals = await runAiResearch(user.id);
      stages.push({
        stage: "ai-research",
        status: aiSignals.length === 0 ? "warn" : "pass",
        durationMs: Date.now() - start,
        details: {
          signalsReturned: aiSignals.length,
          sampleTitles: aiSignals.slice(0, 3).map((s) => s.title.slice(0, 100)),
          ...(aiSignals.length === 0 ? { warning: "No AI research signals — check Perplexity/Tavily API keys" } : {}),
        },
      });
    } catch (err) {
      stages.push({ stage: "ai-research", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 6. Knowledge graph pruning — LIVE
    start = Date.now();
    try {
      const pruneResult = await pruneKnowledgeGraph(user.id);
      stages.push({
        stage: "knowledge-prune",
        status: "pass",
        durationMs: Date.now() - start,
        details: { pruned: pruneResult.pruned, kept: pruneResult.kept, exempt: pruneResult.exempt },
      });
    } catch (err) {
      stages.push({ stage: "knowledge-prune", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 7. Signal pool — check what's available for scoring
    start = Date.now();
    let candidateCount = 0;
    try {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const provRows = await db.select({ signalId: signalProvenance.signalId }).from(signalProvenance).where(eq(signalProvenance.userId, user.id));
      const signalIds = provRows.map((r) => r.signalId);

      let layerBreakdown: Record<string, number> = {};
      if (signalIds.length > 0) {
        const recentSignals = await db.select({ id: signals.id, layer: signals.layer }).from(signals).where(and(inArray(signals.id, signalIds), gte(signals.ingestedAt, twoDaysAgo)));
        candidateCount = recentSignals.length;
        layerBreakdown = recentSignals.reduce((acc, s) => { acc[s.layer || "unknown"] = (acc[s.layer || "unknown"] || 0) + 1; return acc; }, {} as Record<string, number>);
      }

      stages.push({
        stage: "signal-pool",
        status: candidateCount === 0 ? "fail" : candidateCount < 5 ? "warn" : "pass",
        durationMs: Date.now() - start,
        details: {
          totalProvenance: signalIds.length,
          recentCandidates: candidateCount,
          layerBreakdown,
          ...(candidateCount === 0 ? { error: "No recent signals — scoring cannot run" } : {}),
        },
      });
    } catch (err) {
      stages.push({ stage: "signal-pool", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 8. Scoring agent — LIVE: runs the LLM scoring agent
    start = Date.now();
    if (candidateCount > 0) {
      try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const provRows = await db.select({ signalId: signalProvenance.signalId }).from(signalProvenance).where(eq(signalProvenance.userId, user.id));
        const signalIds = provRows.map((r) => r.signalId);
        const signalRows = await db
          .select({ title: signals.title, summary: signals.summary, sourceUrl: signals.sourceUrl, metadata: signals.metadata, layer: signals.layer })
          .from(signals)
          .where(and(inArray(signals.id, signalIds), gte(signals.ingestedAt, twoDaysAgo)))
          .limit(200);

        const candidates = signalRows.map((r) => ({
          title: r.title,
          summary: r.summary || r.title,
          sourceUrl: r.sourceUrl,
          sourceLabel: (r.metadata as Record<string, string>)?.source_domain || (r.metadata as Record<string, string>)?.source_label || r.layer || null,
        }));

        const agentResult = await runScoringAgent(user.id, candidates, DEFAULT_AGENT_CONFIG);
        if (!agentResult) {
          stages.push({ stage: "scoring", status: "fail", durationMs: Date.now() - start, details: { error: "Scoring agent returned null" } });
        } else {
          stages.push({
            stage: "scoring",
            status: agentResult.selections.length === 0 ? "warn" : "pass",
            durationMs: Date.now() - start,
            details: {
              candidatesEvaluated: candidates.length,
              selectionsReturned: agentResult.selections.length,
              toolCallsMade: agentResult.toolCallLog.length,
              model: agentResult.modelUsed,
              promptTokens: agentResult.promptTokens,
              completionTokens: agentResult.completionTokens,
              reasoningPreview: agentResult.reasoning.slice(0, 500),
              ...(agentResult.selections.length === 0 ? { warning: "No signals cleared interestingness threshold" } : {}),
              selections: agentResult.selections.slice(0, 5).map((s) => ({
                index: s.signalIndex,
                reason: s.reason,
                label: s.reasonLabel,
              })),
            },
          });
        }
      } catch (err) {
        stages.push({ stage: "scoring", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
      }
    } else {
      stages.push({ stage: "scoring", status: "fail", durationMs: 0, details: { error: "Skipped — no candidates available" } });
    }

    // 9. API keys check
    start = Date.now();
    const apiKeys: Record<string, boolean> = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
      TAVILY_API_KEY: !!process.env.TAVILY_API_KEY,
      NEWSAPI_AI_KEY: !!process.env.NEWSAPI_AI_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      SERPAPI_API_KEY: !!process.env.SERPAPI_API_KEY,
    };
    const missing = Object.entries(apiKeys).filter(([, v]) => !v).map(([k]) => k);
    stages.push({
      stage: "api-keys",
      status: !apiKeys.OPENAI_API_KEY ? "fail" : missing.length > 1 ? "warn" : "pass",
      durationMs: Date.now() - start,
      details: { ...apiKeys, ...(missing.length > 0 ? { missing } : {}) },
    });

    results.push({ userId: user.id, email: user.email, stages });
  }

  const overallHealth = results.map((r) => {
    const fails = r.stages.filter((s) => s.status === "fail").length;
    const warns = r.stages.filter((s) => s.status === "warn").length;
    return { userId: r.userId, email: r.email, fails, warns, passes: r.stages.length - fails - warns, totalMs: r.stages.reduce((s, st) => s + st.durationMs, 0) };
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    usersChecked: results.length,
    summary: {
      healthy: overallHealth.filter((h) => h.fails === 0 && h.warns === 0).length,
      warnings: overallHealth.filter((h) => h.fails === 0 && h.warns > 0).length,
      failing: overallHealth.filter((h) => h.fails > 0).length,
    },
    results,
  });
}
