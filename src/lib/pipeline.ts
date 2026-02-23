import { db } from "./db";
import { users, userProfiles, briefings, signals, signalProvenance } from "./schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { chat } from "./llm";
import { runScoringAgent, DEFAULT_AGENT_CONFIG } from "./scoring-agent";
import type { AgentScoringConfig } from "../models/relevance";
import { sendBriefingEmail } from "./delivery";
import { extractAndSeedEntities } from "./briefing-entity-extraction";
import { updatePipelineStatus } from "./pipeline-status";
import { deriveNewsQueries, pollNewsQueries, refreshQueriesForUser } from "./news-ingestion";
import { deriveFeedsForUser, pollSyndicationFeeds } from "./syndication";
import { runAiResearch } from "./ai-research";
import { createReplySession } from "./channel-replies";
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

  ulog.info({ userName: user.name, company: user.company }, "Profile loaded");

  // Ingest fresh signals before scoring
  const diagnostics: Record<string, unknown> = {};

  updatePipelineStatus(userId, "ingesting-news");
  try {
    ulog.info("Deriving news queries");
    await deriveNewsQueries(userId);
    await refreshQueriesForUser(userId);
    const newsResult = await pollNewsQueries(crypto.randomUUID());
    diagnostics.news = {
      queriesPolled: newsResult.queriesPolled,
      articlesFound: newsResult.articlesFound,
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

  if (!agentResult || agentResult.selections.length === 0) {
    ulog.error({ agentResult: agentResult ? "empty selections" : "null", elapsed: Date.now() - pipelineStart }, "Scoring agent returned no selections");
    updatePipelineStatus(userId, "failed", { error: "Scoring agent returned no selections" });
    return null;
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
          content: `You write briefing items. Each item is ONE line — two short sentences max. Plain English. No jargon, no marketing speak, no filler words. Say what happened and why it matters to this person, nothing else.

Rules:
- State the concrete fact first, then the "so what" in the same breath.
- Weave the attribution (why it matters to them) naturally — don't label it.
- No exclamation marks. No "importantly", "notably", "significantly", "it's worth noting". No editorializing.
- If you can't say it in one line, you don't understand it well enough.

Good examples:
- "Swiss Re is using satellite triggers for parametric payouts — directly relevant to the product you're launching."
- "SEC finalized Scope 3 disclosure rules, compliance deadline 2027."
- "Lemonade's AI underwriting cut loss ratios 18%, first hard number from a carrier your size."
- "Sarah Chen's company just laid off 30% of engineering, and you're meeting her at 2pm."

Bad examples (DO NOT write like this):
- "In a significant development for the insurance industry, Swiss Re and Munich Re are expanding their parametric products..."
- "Recent developments show that transformer-based underwriting models are demonstrating improvements..."
- "This is relevant to your initiative around AI integration and digital transformation."

Return valid JSON: an array of objects with {id, reason, reasonLabel, topic, content, sourceUrl, sourceLabel, attribution}. Generate a UUID for each id. The attribution field should contain the raw attribution text.`,
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
