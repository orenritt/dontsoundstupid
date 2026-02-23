import { db } from "./db";
import { users, userProfiles, briefings } from "./schema";
import { eq } from "drizzle-orm";
import { chat } from "./llm";
import { runScoringAgent, DEFAULT_AGENT_CONFIG } from "./scoring-agent";
import type { AgentScoringConfig } from "../models/relevance";
import { pollNewsQueries, deriveNewsQueries } from "./news-ingestion";
import { deriveFeedsForUser, pollSyndicationFeeds } from "./syndication";
import { sendBriefingEmail } from "./delivery";

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

  if (!user || !profile) return null;

  const topics = (profile.parsedTopics as string[]) || [];
  const initiatives = (profile.parsedInitiatives as string[]) || [];
  const concerns = (profile.parsedConcerns as string[]) || [];
  const weakAreas = (profile.parsedWeakAreas as string[]) || [];

  const contextSummary = [
    `Role: ${user.title || "Professional"} at ${user.company || "their company"}`,
    topics.length > 0 ? `Topics: ${topics.join(", ")}` : "",
    initiatives.length > 0 ? `Initiatives: ${initiatives.join(", ")}` : "",
    concerns.length > 0 ? `Concerns: ${concerns.join(", ")}` : "",
    weakAreas.length > 0 ? `Wants to learn about: ${weakAreas.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  // Step 0a: Derive and poll news queries from GDELT
  let newsSignals: RawSignal[] = [];
  try {
    await deriveNewsQueries(userId);
    const newsResult = await pollNewsQueries(crypto.randomUUID());
    newsSignals = newsResult.signals.map((s) => ({
      title: s.title,
      summary: s.summary || s.content,
      sourceUrl: s.sourceUrl,
      sourceLabel: s.metadata.source_domain || null,
    }));
  } catch (err) {
    console.error("News ingestion layer failed (non-critical):", err);
  }

  // Step 0b: Poll RSS/syndication feeds
  let syndicationSignals: RawSignal[] = [];
  try {
    await deriveFeedsForUser(userId);
    const synResult = await pollSyndicationFeeds();
    syndicationSignals = synResult.signals.map((s) => ({
      title: s.title,
      summary: s.summary || s.content,
      sourceUrl: s.sourceUrl,
      sourceLabel: s.metadata.siteName || null,
    }));
  } catch (err) {
    console.error("Syndication ingestion layer failed (non-critical):", err);
  }

  // Step 1: Generate candidate signals via AI research
  const signalResponse = await chat(
    [
      {
        role: "system",
        content: `You are an intelligence analyst. Given a professional's context, generate 15-25 real, current pieces of intelligence they should know about today. Each item should be something that actually matters for their specific job. Cast a wide net — the scoring agent downstream will select the best ones.

For each signal, provide:
- title: short headline
- summary: 1-2 sentence factual description
- sourceUrl: a real URL to a relevant source (news article, blog post, paper, etc.) or null if you can't provide one
- sourceLabel: source publication name (e.g., "TechCrunch", "arXiv") or null

Return valid JSON: an array of signal objects with these exact fields. Focus on genuinely useful, specific intelligence — not generic industry news.`,
      },
      {
        role: "user",
        content: contextSummary,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.8 }
  );

  let signals: RawSignal[] = [];
  try {
    signals = JSON.parse(signalResponse.content);
  } catch {
    console.error("Failed to parse signals from LLM");
    return null;
  }

  if (!Array.isArray(signals) || signals.length === 0) {
    signals = [];
  }

  // Merge external signals into the candidate pool
  signals = [...signals, ...newsSignals, ...syndicationSignals];
  if (signals.length === 0) return null;

  // Step 2: Agent-based selection — the scoring agent evaluates the full
  // candidate pool against the user's profile, knowledge graph, feedback
  // history, and peer context using tools for deeper analysis.
  const config = { ...DEFAULT_AGENT_CONFIG, ...agentConfig };
  const agentResult = await runScoringAgent(userId, signals, config);

  if (!agentResult || agentResult.selections.length === 0) return null;

  // Map agent selections back to signals
  const selectedSignals = agentResult.selections
    .filter((s) => s.signalIndex >= 0 && s.signalIndex < signals.length)
    .map((selection) => ({
      signal: signals[selection.signalIndex]!,
      reason: selection.reason,
      reasonLabel: selection.reasonLabel,
    }));

  if (selectedSignals.length === 0) return null;

  // Step 3: Compose briefing — LLM formats agent-selected signals into dry bullets
  const compositionResponse = await chat(
    [
      {
        role: "system",
        content: `You are composing a daily intelligence briefing. The tone is dry, all-business, no personality. Each item is 1-2 sentences max. No editorializing, no "you should care because", no action items, no exclamation marks. Just the facts.

You will receive pre-selected signals with reasons. For each, preserve the reason/reasonLabel and write a tight 1-2 sentence body. Return valid JSON: an array of objects with {id, reason, reasonLabel, topic, content, sourceUrl, sourceLabel}. Generate a UUID for each id.`,
      },
      {
        role: "user",
        content: JSON.stringify(
          selectedSignals.map((s) => ({
            title: s.signal.title,
            summary: s.signal.summary,
            reason: s.reason,
            reasonLabel: s.reasonLabel,
            sourceUrl: s.signal.sourceUrl,
            sourceLabel: s.signal.sourceLabel,
          }))
        ),
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.3 }
  );

  let items: {
    id: string;
    reason: string;
    reasonLabel: string;
    topic: string;
    content: string;
    sourceUrl: string | null;
    sourceLabel: string | null;
  }[] = [];

  try {
    items = JSON.parse(compositionResponse.content);
  } catch {
    items = selectedSignals.map((s) => ({
      id: crypto.randomUUID(),
      reason: s.reason,
      reasonLabel: s.reasonLabel,
      topic: s.signal.title,
      content: s.signal.summary,
      sourceUrl: s.signal.sourceUrl,
      sourceLabel: s.signal.sourceLabel,
    }));
  }

  // Step 4: Save briefing with agent metadata
  const totalPromptTokens =
    signalResponse.promptTokens +
    compositionResponse.promptTokens +
    agentResult.promptTokens;
  const totalCompletionTokens =
    signalResponse.completionTokens +
    compositionResponse.completionTokens +
    agentResult.completionTokens;

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

  if (!briefing?.id) return null;

  // Step 5: Deliver via email if configured
  const deliveryChannel = profile.deliveryChannel;
  if (deliveryChannel === "email" && user.email && process.env.RESEND_API_KEY) {
    try {
      await sendBriefingEmail({
        toEmail: user.email,
        userName: user.name || "there",
        items,
        briefingId: briefing.id,
      });
    } catch (err) {
      console.error("Email delivery failed (non-critical):", err);
    }
  }

  return briefing.id;
}
