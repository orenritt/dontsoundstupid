import { db } from "../db";
import {
  users,
  userProfiles,
  impressContacts,
  peerOrganizations,
  meetings,
  meetingAttendees,
  signals as signalsTable,
  signalProvenance,
} from "../schema";
import { eq, gte, lte, and } from "drizzle-orm";
import { toStringArray } from "../safe-parse";
import { searchPerplexity } from "./perplexity-client";
import { searchTavily } from "./tavily-client";
import { deriveEnrichedResearchQueries, deriveMeetingPrepQueries, type MeetingContext } from "./query-derivation";
import { createLogger } from "../logger";
import type { ContentUniverse } from "../../models/content-universe";

const log = createLogger("ai-research");
const MAX_PERPLEXITY_QUERIES = 15;
const MAX_TAVILY_QUERIES = 20;

interface RawSignal {
  title: string;
  summary: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
}

export async function runAiResearch(userId: string): Promise<RawSignal[]> {
  const ulog = log.child({ userId });
  const start = Date.now();
  ulog.info("Starting AI research");

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
    ulog.warn({ hasUser: !!user, hasProfile: !!profile }, "User/profile not found — returning empty");
    return [];
  }

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

  const contentUniverse = (profile as Record<string, unknown>).contentUniverse as ContentUniverse | null;

  const profileContext = {
    role: user.title || "professional",
    company: user.company || "their company",
    topics: toStringArray(profile.parsedTopics),
    initiatives: toStringArray(profile.parsedInitiatives),
    concerns: toStringArray(profile.parsedConcerns),
    knowledgeGaps: toStringArray(profile.parsedKnowledgeGaps),
    impressListCompanies: impressCompanies,
    peerOrgNames,
  };

  const now = new Date();
  const tomorrowEnd = new Date(now);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const todayMeetings = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        gte(meetings.startTime, now),
        lte(meetings.startTime, tomorrowEnd)
      )
    );

  const impressNamesLower = new Set(
    contacts.map((c) => (c.name || "").toLowerCase()).filter(Boolean)
  );

  const meetingContexts: MeetingContext[] = [];
  for (const meeting of todayMeetings) {
    const attendees = await db
      .select()
      .from(meetingAttendees)
      .where(eq(meetingAttendees.meetingId, meeting.id));

    meetingContexts.push({
      title: meeting.title,
      startTime: meeting.startTime,
      attendees: attendees.map((a) => ({
        name: a.name,
        title: a.title,
        company: a.company,
        isOnImpressList: impressNamesLower.has((a.name || "").toLowerCase()),
      })),
    });
  }

  const meetingPrepQueries = deriveMeetingPrepQueries(profileContext, meetingContexts, contentUniverse);
  ulog.info({ meetingsFound: todayMeetings.length, meetingPrepQueries: meetingPrepQueries.length }, "Meeting prep queries derived");

  ulog.info({ impressCompanies: impressCompanies.length, peerOrgs: peerOrgNames.length, hasContentUniverse: !!contentUniverse }, "Deriving research queries");
  const queries = await deriveEnrichedResearchQueries(profileContext, contentUniverse);

  const universeContext = contentUniverse
    ? `\n\nTheir content universe: ${contentUniverse.definition}\nCore topics they track: ${contentUniverse.coreTopics.join(", ")}${contentUniverse.exclusions.length > 0 ? `\nTopics to EXCLUDE: ${contentUniverse.exclusions.join(", ")}` : ""}`
    : "";
  const systemContext = `You are an intelligence analyst briefing a ${user.title || "professional"} at ${user.company || "a company"}.${universeContext}

Your job: find things they NEED to know but probably DON'T yet. Prioritize by:
1. Novel information — things that just happened or just became known
2. Direct relevance — connects to their specific work, not just their broad industry
3. Actionability — they could or should do something with this knowledge

Be specific and factual. Include concrete numbers, names, dates. No filler. Focus on the last 24-48 hours.`;

  const allPerplexity = [...meetingPrepQueries, ...queries.perplexityQueries];
  const cappedPerplexity = allPerplexity.slice(
    0,
    MAX_PERPLEXITY_QUERIES
  );
  const cappedTavily = queries.tavilyQueries.slice(0, MAX_TAVILY_QUERIES);

  ulog.info({ perplexityQueries: cappedPerplexity.length, tavilyQueries: cappedTavily.length, totalDerived: { perplexity: allPerplexity.length, meetingPrep: meetingPrepQueries.length, tavily: queries.tavilyQueries.length } }, "Research queries derived");

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
          ulog.error({ err, query }, "Perplexity query failed (non-critical)");
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
            maxResults: 10,
          });
          if (!result) return null;
          return { query, results: result.results };
        } catch (err) {
          ulog.error({ err, query }, "Tavily query failed (non-critical)");
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
      ulog.error({ err, signalUrl: sig.sourceUrl }, "Failed to persist AI research signal");
    }
  }

  ulog.info({ totalSignals: rawSignals.length, persisted: rawSignals.filter(s => s.sourceUrl).length, totalMs: Date.now() - start }, "AI research complete");
  return rawSignals;
}
