import { db } from "../db";
import {
  users,
  userProfiles,
  impressContacts,
  peerOrganizations,
  signals as signalsTable,
  signalProvenance,
} from "../schema";
import { eq } from "drizzle-orm";
import { toStringArray } from "../safe-parse";
import { searchPerplexity } from "./perplexity-client";
import { searchTavily } from "./tavily-client";
import { deriveEnrichedResearchQueries } from "./query-derivation";

const MAX_PERPLEXITY_QUERIES = 5;
const MAX_TAVILY_QUERIES = 10;

interface RawSignal {
  title: string;
  summary: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
}

export async function runAiResearch(userId: string): Promise<RawSignal[]> {
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

  if (!user || !profile) return [];

  const contacts = await db
    .select()
    .from(impressContacts)
    .where(eq(impressContacts.userId, userId));

  const peers = await db
    .select()
    .from(peerOrganizations)
    .where(eq(peerOrganizations.userId, userId));

  const impressCompanies = [
    ...new Set(
      contacts
        .map((c) => c.company)
        .filter((c): c is string => !!c && c.length > 0)
    ),
  ];

  const peerOrgNames = peers
    .filter((p) => p.confirmed !== false)
    .map((p) => p.name);

  const queries = await deriveEnrichedResearchQueries({
    role: user.title || "professional",
    company: user.company || "their company",
    topics: toStringArray(profile.parsedTopics),
    initiatives: toStringArray(profile.parsedInitiatives),
    concerns: toStringArray(profile.parsedConcerns),
    knowledgeGaps: toStringArray(profile.parsedKnowledgeGaps),
    impressListCompanies: impressCompanies,
    peerOrgNames,
  });

  const systemContext = `You are a research assistant for a ${user.title || "professional"} at ${user.company || "a company"}. Provide concise, factual intelligence. Focus on the last 24-48 hours of developments.`;

  const cappedPerplexity = queries.perplexityQueries.slice(
    0,
    MAX_PERPLEXITY_QUERIES
  );
  const cappedTavily = queries.tavilyQueries.slice(0, MAX_TAVILY_QUERIES);

  const [perplexityResults, tavilyResults] = await Promise.all([
    Promise.all(
      cappedPerplexity.map(async (query) => {
        try {
          const result = await searchPerplexity(query, systemContext);
          if (!result || !result.content) return null;
          return {
            query,
            content: result.content,
            citations: result.citations,
          };
        } catch (err) {
          console.error(`Perplexity query failed (non-critical): ${query}`, err);
          return null;
        }
      })
    ),
    Promise.all(
      cappedTavily.map(async (query) => {
        try {
          const result = await searchTavily(query, {
            topic: "news",
            timeRange: "week",
            maxResults: 5,
          });
          if (!result) return null;
          return { query, results: result.results };
        } catch (err) {
          console.error(`Tavily query failed (non-critical): ${query}`, err);
          return null;
        }
      })
    ),
  ]);

  const rawSignals: RawSignal[] = [];

  for (const pr of perplexityResults) {
    if (!pr) continue;
    const firstLine = pr.content.split("\n")[0] || pr.query;
    const title =
      firstLine.length > 120 ? firstLine.slice(0, 117) + "..." : firstLine;
    rawSignals.push({
      title,
      summary: pr.content,
      sourceUrl: pr.citations[0] ?? null,
      sourceLabel: "Perplexity",
    });
  }

  for (const tr of tavilyResults) {
    if (!tr) continue;
    for (const result of tr.results) {
      if (!result.title && !result.content) continue;
      let domain: string | null = null;
      try {
        domain = new URL(result.url).hostname.replace(/^www\./, "");
      } catch {
        // invalid URL
      }
      rawSignals.push({
        title: result.title || tr.query,
        summary: result.content || result.title,
        sourceUrl: result.url || null,
        sourceLabel: domain,
      });
    }
  }

  // Persist to signals table
  for (const sig of rawSignals) {
    if (!sig.sourceUrl) continue;
    try {
      const [inserted] = await db
        .insert(signalsTable)
        .values({
          layer: "ai-research",
          sourceUrl: sig.sourceUrl,
          title: sig.title,
          content: sig.summary,
          summary: sig.summary,
          metadata: sig.sourceLabel ? { source_label: sig.sourceLabel } : {},
          publishedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: signalsTable.id });

      if (inserted) {
        await db
          .insert(signalProvenance)
          .values({
            signalId: inserted.id,
            userId,
            triggerReason: "ai-discovery",
            profileReference: "ai-research",
          })
          .onConflictDoNothing();
      }
    } catch (err) {
      console.error("Failed to persist AI research signal:", err);
    }
  }

  return rawSignals;
}
