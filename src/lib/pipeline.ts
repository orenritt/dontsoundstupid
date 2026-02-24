import { db } from "./db";
import { users, userProfiles, briefings, signals, signalProvenance } from "./schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { chat } from "./llm";
import { runScoringAgent, DEFAULT_AGENT_CONFIG } from "./scoring-agent";
import type { AgentScoringConfig } from "../models/relevance";
import { sendBriefingEmail } from "./delivery";
import { extractAndSeedEntities } from "./briefing-entity-extraction";
import { pruneKnowledgeGraph } from "./knowledge-prune";
import { updatePipelineStatus } from "./pipeline-status";
import { deriveNewsQueries, pollNewsQueries, refreshQueriesForUser } from "./news-ingestion";
import { deriveFeedsForUser, pollSyndicationFeeds } from "./syndication";
import { runAiResearch } from "./ai-research";
import { createReplySession } from "./channel-replies";
import type { ContentUniverse } from "../models/content-universe";
import { createLogger } from "./logger";

const log = createLogger("pipeline");

interface RawSignal {
  title: string;
  summary: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
}

export async function runPipeline(
  userId: string,
  agentConfig?: Partial<AgentScoringConfig>
): Promise<string | null> {
  const ulog = log.child({ userId });
  const pipelineStart = Date.now();
  ulog.info("Pipeline started");

  updatePipelineStatus(userId, "loading-profile");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!user || !profile) {
    ulog.error({ hasUser: !!user, hasProfile: !!profile }, "User or profile not found — aborting pipeline");
    updatePipelineStatus(userId, "failed", { error: "User or profile not found" });
    return null;
  }

  const contentUniverse = profile.contentUniverse as ContentUniverse | null;
  ulog.info({ userName: user.name, company: user.company, contentUniverseApplied: !!contentUniverse, contentUniverseVersion: contentUniverse?.version ?? null }, "Profile loaded");

  // Ingest fresh signals before scoring
  const diagnostics: Record<string, unknown> = {
    contentUniverseApplied: !!contentUniverse,
    contentUniverseVersion: contentUniverse?.version ?? null,
  };

  updatePipelineStatus(userId, "ingesting-news");
  try {
    ulog.info("Deriving news queries");
    await deriveNewsQueries(userId);
    await refreshQueriesForUser(userId);
    const newsResult = await pollNewsQueries(crypto.randomUUID());
    diagnostics.news = {
      queriesPolled: newsResult.queriesPolled,
      articlesFound: newsResult.articlesFound,
      filteredOut: newsResult.filteredOut,
      signalsCreated: newsResult.signals.length,
      errors: newsResult.errorsEncounted,
    };
    ulog.info(diagnostics.news, "News ingestion complete");
  } catch (err) {
    diagnostics.news = { error: err instanceof Error ? err.message : String(err) };
    ulog.error({ err }, "News ingestion failed (continuing)");
  }

  try {
    ulog.info("Deriving syndication feeds");
    const feedsCreated = await deriveFeedsForUser(userId);
    const synResult = await pollSyndicationFeeds();
    diagnostics.syndication = {
      feedsCreated,
      feedsPolled: synResult.feedsPolled,
      newItems: synResult.newItems,
      errors: synResult.errors,
    };
    ulog.info(diagnostics.syndication, "Syndication ingestion complete");
  } catch (err) {
    diagnostics.syndication = { error: err instanceof Error ? err.message : String(err) };
    ulog.error({ err }, "Syndication ingestion failed (continuing)");
  }

  updatePipelineStatus(userId, "ai-research");
  try {
    ulog.info("Running AI research");
    const aiSignals = await runAiResearch(userId);
    diagnostics.aiResearch = { signalsReturned: aiSignals.length };
    ulog.info(diagnostics.aiResearch, "AI research complete");
  } catch (err) {
    diagnostics.aiResearch = { error: err instanceof Error ? err.message : String(err) };
    ulog.error({ err }, "AI research failed (continuing)");
  }

  try {
    ulog.info("Pruning knowledge graph before scoring");
    const pruneResult = await pruneKnowledgeGraph(userId);
    diagnostics.knowledgePrune = { pruned: pruneResult.pruned, kept: pruneResult.kept, exempt: pruneResult.exempt };
    if (pruneResult.pruned > 0) {
      ulog.info(diagnostics.knowledgePrune, "Knowledge graph pruned");
    }
  } catch (err) {
    diagnostics.knowledgePrune = { error: err instanceof Error ? err.message : String(err) };
    ulog.error({ err }, "Knowledge graph pruning failed (continuing)");
  }

  updatePipelineStatus(userId, "loading-signals");
  ulog.info("Loading candidate signals");

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const userProvenanceRows = await db
    .select({ signalId: signalProvenance.signalId })
    .from(signalProvenance)
    .where(eq(signalProvenance.userId, userId));

  const userSignalIds = userProvenanceRows.map((r) => r.signalId);

  let candidateSignals: RawSignal[] = [];

  if (userSignalIds.length > 0) {
    const signalRows = await db
      .select({
        title: signals.title,
        summary: signals.summary,
        sourceUrl: signals.sourceUrl,
        metadata: signals.metadata,
        layer: signals.layer,
        ingestedAt: signals.ingestedAt,
      })
      .from(signals)
      .where(
        and(
          inArray(signals.id, userSignalIds),
          gte(signals.ingestedAt, twoDaysAgo)
        )
      )
      .orderBy(signals.ingestedAt)
      .limit(200);

    const allSignalRows = await db
      .select({ id: signals.id, ingestedAt: signals.ingestedAt, layer: signals.layer })
      .from(signals)
      .where(inArray(signals.id, userSignalIds))
      .limit(500);

    diagnostics.signalLoading = {
      provenanceRows: userSignalIds.length,
      totalSignalsForUser: allSignalRows.length,
      signalsWithin2Days: signalRows.length,
      oldestSignal: allSignalRows.length > 0
        ? allSignalRows.reduce((oldest, s) => {
            const d = s.ingestedAt ? new Date(s.ingestedAt) : new Date(0);
            return d < oldest ? d : oldest;
          }, new Date()).toISOString()
        : null,
      cutoffDate: twoDaysAgo.toISOString(),
      layerBreakdown: allSignalRows.reduce((acc, s) => {
        acc[s.layer || "unknown"] = (acc[s.layer || "unknown"] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
    ulog.info(diagnostics.signalLoading, "Signal loading complete");

    candidateSignals = signalRows.map((r) => ({
      title: r.title,
      summary: r.summary || r.title,
      sourceUrl: r.sourceUrl,
      sourceLabel:
        (r.metadata as Record<string, string>)?.source_domain ||
        (r.metadata as Record<string, string>)?.siteName ||
        (r.metadata as Record<string, string>)?.source_label ||
        r.layer ||
        null,
    }));
  } else {
    diagnostics.signalLoading = { provenanceRows: 0 };
    ulog.warn("No provenance rows for user — no signals to score");
  }

  if (candidateSignals.length === 0) {
    ulog.error({ diagnostics, elapsed: Date.now() - pipelineStart }, "No candidate signals — pipeline cannot continue");
    updatePipelineStatus(userId, "failed", { error: "No signals found. Ingestion may still be warming up — try again in a minute.", diagnostics });
    return null;
  }

  updatePipelineStatus(userId, "scoring");
  ulog.info({ candidateCount: candidateSignals.length }, "Starting scoring agent");
  const scoringStart = Date.now();

  const config = { ...DEFAULT_AGENT_CONFIG, ...agentConfig };
  const agentResult = await runScoringAgent(userId, candidateSignals, config);

  if (!agentResult) {
    ulog.error({ elapsed: Date.now() - pipelineStart }, "Scoring agent returned null — pipeline failure");
    updatePipelineStatus(userId, "failed", { error: "Scoring agent returned no result" });
    return null;
  }

  if (agentResult.selections.length === 0 && !config.forceGenerate) {
    const totalMs = Date.now() - pipelineStart;
    ulog.info({ candidateCount: candidateSignals.length, totalMs }, "No signals cleared interestingness threshold — skipping briefing");
    updatePipelineStatus(userId, "skipped-nothing-interesting", {
      diagnostics: {
        candidateCount: candidateSignals.length,
        scoringReasoning: agentResult.reasoning.slice(0, 2000),
        candidates: candidateSignals.slice(0, 30).map((s, i) => ({
          index: i,
          title: s.title,
          summary: s.summary.slice(0, 200),
          sourceLabel: s.sourceLabel,
          sourceUrl: s.sourceUrl,
        })),
      },
    });
    return "skipped";
  }

  if (agentResult.selections.length === 0 && config.forceGenerate) {
    ulog.info({ candidateCount: candidateSignals.length }, "Force-generate: re-running scoring with relaxed threshold");
    const forcedResult = await runScoringAgent(userId, candidateSignals, {
      ...config,
      forceGenerate: true,
    });
    if (forcedResult && forcedResult.selections.length > 0) {
      Object.assign(agentResult, forcedResult);
    } else {
      ulog.warn("Force-generate: still no selections after relaxed scoring");
      updatePipelineStatus(userId, "skipped-nothing-interesting", {
        diagnostics: {
          candidateCount: candidateSignals.length,
          scoringReasoning: agentResult.reasoning.slice(0, 2000),
          candidates: candidateSignals.slice(0, 30).map((s, i) => ({
            index: i,
            title: s.title,
            summary: s.summary.slice(0, 200),
            sourceLabel: s.sourceLabel,
            sourceUrl: s.sourceUrl,
          })),
          forceGenerateFailed: true,
        },
      });
      return "skipped";
    }
  }

  ulog.info({ selections: agentResult.selections.length, scoringMs: Date.now() - scoringStart, toolCalls: agentResult.toolCallLog.length, model: agentResult.modelUsed }, "Scoring complete");

  const selectedSignals = agentResult.selections
    .filter((s) => s.signalIndex >= 0 && s.signalIndex < candidateSignals.length)
    .map((selection) => ({
      signal: candidateSignals[selection.signalIndex]!,
      reason: selection.reason,
      reasonLabel: selection.reasonLabel,
      attribution: selection.attribution,
    }));

  if (selectedSignals.length === 0) {
    updatePipelineStatus(userId, "failed", { error: "No valid signals after filtering" });
    return null;
  }

  updatePipelineStatus(userId, "composing");
  let items: {
    id: string;
    reason: string;
    reasonLabel: string;
    topic: string;
    content: string;
    sourceUrl: string | null;
    sourceLabel: string | null;
    attribution: string | null;
  }[] = [];

  let compositionPromptTokens = 0;
  let compositionCompletionTokens = 0;

  try {
    const compositionResponse = await chat(
      [
        {
          role: "system",
          content: `You write briefing items. Each item should be self-contained — the reader should GET IT without clicking anything. The link is a bonus for going deeper, not a requirement.

2-3 short sentences. Say what happened, include the key number or detail, and make it clear why this person should care — all in the text itself. No filler, no jargon, every word earns its place.

Rules:
- Lead with the concrete fact. What actually happened?
- Include the specific detail that makes it matter — the number, the name, the deadline, the percentage.
- Connect it to this person naturally. Don't label it ("This is relevant because..."), just make the connection obvious.
- The source link (sourceUrl) is separate metadata — do NOT put URLs in the content text. The UI handles link display.
- No exclamation marks. No "importantly", "notably", "significantly", "it's worth noting". No editorializing.
- No preamble. Never start with "In a move that..." or "In a significant development..."
- Aim for 40-80 words per item. Enough to actually understand, short enough to respect their time.

Good:
- "Swiss Re launched satellite-triggered parametric payouts, bypassing traditional claims adjustment entirely. This is the exact model you've been building toward — first major reinsurer to go live with it."
- "SEC finalized Scope 3 disclosure rules with a 2027 compliance deadline. Your supply chain reporting stack isn't ready for this yet, and neither is anyone else's — early movers have 18 months of runway."
- "Lemonade's AI underwriting cut loss ratios 18% last quarter. First hard number from a carrier your size proving the model works at scale."
- "Sarah Chen's company just laid off 30% of engineering. You're meeting her at 2pm — she'll likely be focused on doing more with less."

Bad:
- "In a significant development for the insurance industry, Swiss Re and Munich Re are expanding their parametric products..." (too formal, too vague)
- "Recent developments show that transformer-based underwriting models are demonstrating improvements..." (no specific fact, no number)
- "This is relevant to your initiative around AI integration and digital transformation." (never explain relevance like this)
- "Check this out: https://reuters.com/..." (link-dependent — content should stand alone)

Return valid JSON: array of {id, reason, reasonLabel, topic, content, sourceUrl, sourceLabel, attribution}. Generate a UUID for each id. The content field is the briefing text. The sourceUrl is separate — do not embed it in content.`,
        },
        {
          role: "user",
          content: JSON.stringify(
            selectedSignals.map((s) => ({
              title: s.signal.title,
              summary: s.signal.summary,
              reason: s.reason,
              reasonLabel: s.reasonLabel,
              attribution: s.attribution,
              sourceUrl: s.signal.sourceUrl,
              sourceLabel: s.signal.sourceLabel,
            }))
          ),
        },
      ],
      { model: "gpt-4o-mini", temperature: 0.3, maxTokens: 4096 }
    );

    compositionPromptTokens = compositionResponse.promptTokens;
    compositionCompletionTokens = compositionResponse.completionTokens;

    let rawComposition = compositionResponse.content.trim();
    const compositionFence = rawComposition.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (compositionFence?.[1]) rawComposition = compositionFence[1].trim();
    items = JSON.parse(rawComposition);
  } catch (err) {
    ulog.error({ err }, "Composition LLM failed — falling back to raw signals");
    items = selectedSignals.map((s) => ({
      id: crypto.randomUUID(),
      reason: s.reason,
      reasonLabel: s.reasonLabel,
      topic: s.signal.title,
      content: s.signal.summary,
      sourceUrl: s.signal.sourceUrl,
      sourceLabel: s.signal.sourceLabel,
      attribution: s.attribution || null,
    }));
  }

  updatePipelineStatus(userId, "saving");

  const totalPromptTokens =
    compositionPromptTokens + agentResult.promptTokens;
  const totalCompletionTokens =
    compositionCompletionTokens + agentResult.completionTokens;

  const [briefing] = await db
    .insert(briefings)
    .values({
      userId,
      items,
      modelUsed: agentResult.modelUsed,
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
    })
    .returning();

  if (!briefing?.id) {
    ulog.error("Failed to save briefing to database");
    updatePipelineStatus(userId, "failed", { error: "Failed to save briefing" });
    return null;
  }

  ulog.info({ briefingId: briefing.id, itemCount: items.length, promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens }, "Briefing saved");

  updatePipelineStatus(userId, "delivering", { briefingId: briefing.id });
  try {
    await extractAndSeedEntities(userId, items);
  } catch (err) {
    ulog.error({ err }, "Post-delivery entity extraction failed (non-critical)");
  }

  const deliveryChannel = profile.deliveryChannel || "email";
  if (deliveryChannel === "email" && user.email && process.env.RESEND_API_KEY) {
    try {
      ulog.info({ channel: "email", to: user.email }, "Sending briefing email");
      await sendBriefingEmail({
        toEmail: user.email,
        userName: user.name || "there",
        items,
        briefingId: briefing.id,
      });
      ulog.info("Briefing email sent");
    } catch (err) {
      ulog.error({ err }, "Email delivery failed (non-critical)");
    }
  }

  // Create reply session for channel reply processing
  try {
    await createReplySession(userId, briefing.id, deliveryChannel, items);
  } catch (err) {
    ulog.error({ err }, "Reply session creation failed (non-critical)");
  }

  const totalMs = Date.now() - pipelineStart;
  ulog.info({ briefingId: briefing.id, totalMs, itemCount: items.length }, "Pipeline completed successfully");
  updatePipelineStatus(userId, "done", { briefingId: briefing.id });
  return briefing.id;
}
