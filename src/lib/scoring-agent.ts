import { db } from "./db";
import {
  users,
  userProfiles,
  knowledgeEntities,
  briefings,
  feedbackSignals,
  peerOrganizations,
  impressContacts,
  meetings,
  meetingAttendees,
  meetingIntelligence,
} from "./schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { chat, embed } from "./llm";
import type { LlmMessage } from "./llm";
import { toStringArray } from "./safe-parse";
import type {
  AgentToolName,
  AgentScoringResult,
  AgentScoringConfig,
  SignalSelection,
} from "../models/relevance";
import { createLogger } from "./logger";

const log = createLogger("scoring-agent");
const SERPAPI_KEY = process.env.SERPAPI_API_KEY ?? "";

interface CandidateSignal {
  title: string;
  summary: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
}

interface UserContext {
  name: string | null;
  title: string | null;
  company: string | null;
  topics: string[];
  initiatives: string[];
  concerns: string[];
  weakAreas: string[];
  expertAreas: string[];
  knowledgeGaps: string[];
  rapidFireClassifications: { topic: string; context: string; response: string }[];
  deliveryChannel: string | null;
}

const TOOL_DEFINITIONS = `You have tools you can call to get more information before making your final selection. Call a tool by responding with a JSON object with "tool" and "args" fields. You may call multiple tools in sequence across rounds.

Available tools:

1. check_knowledge_graph
   Checks what the user already knows. Use this to avoid recommending things they're already familiar with.
   Args: { "query": "<topic or entity to check>" }
   Returns: matching known entities with confidence levels.

2. check_feedback_history
   Checks the user's past briefing feedback. Use this to understand what topics they want more or less of.
   Args: {}
   Returns: recent feedback signals (tune-more, tune-less, not-novel, deep-dive requests).

3. compare_with_peers
   Checks what peer organizations and impress-list contacts the user tracks. Use this to assess competitive relevance.
   Args: { "signal_indices": [<indices of signals to check>] }
   Returns: whether any signals relate to tracked peers or contacts.

4. get_signal_provenance
   Checks why a signal was generated — was it from a followed org, peer, impress-list person, general industry scan, or user-curated (forwarded by the user)? User-curated signals have maximum provenance weight (1.0) and include the user's annotation explaining why they forwarded it.
   Args: { "signal_indices": [<indices to check>] }
   Returns: provenance type, score, and user annotation for each signal.

5. assess_freshness
   Checks how timely each signal is relative to the user's last briefing.
   Args: {}
   Returns: when the user last received a briefing and which topics were covered.

6. web_search
   Performs a quick web search to verify or enrich a signal. Use sparingly — only when you need to confirm something is real, currently relevant, or to get additional context.
   Args: { "query": "<search query>" }
   Returns: top search results with snippets.

7. query_google_trends
   Queries Google Trends to understand how search interest around terms is changing. Use this to assess whether a topic is surging, declining, or stable — which helps you decide if a signal represents a genuine emerging trend or yesterday's news. You can compare up to 5 keywords at once.
   Args: { "keywords": ["<term1>", "<term2>", ...], "timeframe": "<optional: 'past_day' | 'past_week' | 'past_month' | 'past_year', default: past_month>", "geo": "<optional: 2-letter country code, e.g. 'US'>" }
   Returns: interest over time data for each keyword (0-100 scale, 100 = peak popularity), whether interest is rising or falling, and related queries that are trending.

8. check_today_meetings
   Checks if the user has meetings today or tomorrow. THIS IS THE MOST IMPORTANT TOOL TO CALL EARLY. Meeting-relevant signals should dominate the briefing. Returns full attendee details, their companies, enrichment data, pre-generated intelligence, and matching hints (companies, people, topics to look for in signals).
   Args: {}
   Returns: list of meetings with attendees, enrichment data, relevant topics, and signal-matching keywords.

9. research_meeting_attendees
   Deep-researches a specific meeting's attendees. Use this AFTER check_today_meetings if you find meetings — it produces a full intel briefing: who each attendee is, what they care about, likely meeting purpose, talking points, potential landmines, and critically — a list of SIGNAL KEYWORDS that should be matched against candidate signals. Any signal matching these keywords is extremely high value.
   Args: { "meeting_id": "<optional: specific meeting ID, defaults to next upcoming meeting>" }
   Returns: per-attendee profiles, meeting purpose analysis, talking points, landmines, and signal keywords.

10. search_briefing_history
    Searches the user's past briefings for a topic or keyword. Use this to check if you've already briefed them on something recently, or to understand what topics they've been following over time.
    Args: { "query": "<optional: search term>", "limit": <optional: max results, default 10> }
    Returns: matching briefing items with dates. If no query, returns recent items.

11. cross_reference_signals
    Analyzes relationships between candidate signals — finds thematic clusters, contradictions, compound narratives, and redundancies. Use this when several signals seem related and you want to understand the bigger picture before picking which ones to include.
    Args: { "signal_indices": [<indices to analyze>] }
    Returns: clusters, contradictions, compound narratives, and redundancy flags.

12. check_expertise_gaps
    Checks which candidate signals address the user's self-identified knowledge gaps or weak areas vs. areas they're already expert in. Use this to find high-educational-value signals that help the user grow.
    Args: { "signal_indices": [<optional: indices to check, defaults to all>] }
    Returns: per-signal analysis of whether it fills a knowledge gap, covers an expert area, and an educational value rating.

When you've made your decision, call:

13. submit_selections
    Submit your final picks.
    Args: { "selections": [{ "signalIndex": <number>, "reason": "<reason-type>", "reasonLabel": "<human-readable label>", "confidence": <0-1>, "noveltyAssessment": "<why this is novel to the user>", "attribution": "<why this matters to THIS user specifically>" }] }
    reason must be one of: people-are-talking, meeting-prep, new-entrant, fundraise-or-deal, regulatory-or-policy, term-emerging, network-activity, your-space, competitive-move, event-upcoming, other.
    IMPORTANT: Use "meeting-prep" as the reason for any signal selected because it's relevant to an upcoming meeting. The reasonLabel should name the specific meeting or person (e.g., "Because you're meeting Sarah Chen at 2pm").
    IMPORTANT: The "attribution" field must explain why this signal is relevant to THIS specific user. Reference concrete profile elements: their impress list contacts, peer orgs, knowledge gaps, initiatives, meeting attendees, or feedback history. Do NOT write generic attributions like "relevant to your industry" — be specific (e.g., "Acme Corp is on your impress list", "You flagged parametric modeling as a knowledge gap", "Sarah Chen's company overlaps with your initiative on risk assessment").

You MUST call submit_selections exactly once to finalize. Do not respond with plain text after calling tools — always either call another tool or submit_selections.

CRITICAL FORMAT REQUIREMENT: Every response you give MUST be a raw JSON object — no markdown, no explanation, no prose. Just:
{"tool": "tool_name", "args": { ... }}

Do NOT write text like "I'll call check_today_meetings" — just output the JSON directly. Do NOT use markdown code fences. Do NOT explain your reasoning in your response. Just output the JSON tool call.`;

function buildSystemPrompt(userContext: UserContext, candidateCount: number, targetCount: number): string {
  return `You are an intelligence analyst selecting the most important signals for a professional's daily briefing. Your job is to pick the ${targetCount} most valuable signals from ${candidateCount} candidates.

THE USER:
- Name: ${userContext.name || "Unknown"}
- Role: ${userContext.title || "Professional"} at ${userContext.company || "their company"}
- Topics they track: ${userContext.topics.length > 0 ? userContext.topics.join(", ") : "not specified"}
- Current initiatives: ${userContext.initiatives.length > 0 ? userContext.initiatives.join("; ") : "none specified"}
- Key concerns: ${userContext.concerns.length > 0 ? userContext.concerns.join("; ") : "none specified"}
- Wants to learn about: ${userContext.weakAreas.length > 0 ? userContext.weakAreas.join(", ") : "not specified"}
- Already expert in: ${userContext.expertAreas.length > 0 ? userContext.expertAreas.join(", ") : "not specified"}
- Knowledge gaps: ${userContext.knowledgeGaps.length > 0 ? userContext.knowledgeGaps.join(", ") : "not specified"}
${userContext.rapidFireClassifications.length > 0 ? `- Quick classifications:\n${userContext.rapidFireClassifications.map((r) => `  "${r.topic}" (${r.context}): ${r.response}`).join("\n")}` : ""}

YOUR FIRST MOVE: Call check_today_meetings immediately.

SELECTION BAR — VERY HIGH. Only select signals the user genuinely needs to know. Ask: "Would this person look stupid in a meeting tomorrow if they didn't know this?" If no, skip it. This is a need-to-know briefing, not a nice-to-know digest.

REJECT these aggressively:
- Vague trend pieces ("AI is transforming X") — unless there is a specific, concrete development
- Marketing or product announcements — unless from a direct competitor or someone on their impress list
- Incremental updates on known topics — they already know; only surface if something materially changed
- Thought-leadership / opinion content — nobody needs to know what some analyst "thinks"
- Industry reports or surveys without a specific surprising finding
- Anything that reads like a press release

ACCEPT only:
- Concrete events: a deal, a hire, a regulation, a launch, a failure, a number
- Things that change what the user should do or say this week
- Genuinely new information they couldn't have known yesterday
- Developments involving specific people, companies, or entities they track

YOUR SELECTION CRITERIA (in priority order):
1. MEETING PREP — If the user has meetings today, check who they're meeting. But be SMART about it:
   - Only prep for meetings with HIGH or MEDIUM prep worthiness (check_today_meetings classifies this).
   - Only research people who matter: impress-list contacts first, then senior people in the user's own org (C-suite, VPs, directors), then senior external people, then external peers. Do NOT research junior analysts, coordinators, or interns.
   - Skip recurring meetings (daily standups, weekly syncs) unless they have high-priority attendees.
   - Use research_meeting_attendees to get signal keywords for prep-worthy meetings, then match those keywords against candidates.
   - HARD CAP: Meeting-prep signals may use AT MOST 3 of the ${targetCount} slots. The remaining slots MUST go to non-meeting signals. The user needs a balanced briefing, not just meeting prep.
   - Use the "meeting-prep" reason with a specific label naming the person (e.g., "Because you're meeting Sarah Chen at 2pm").
2. NOVELTY — Does this tell the user something they don't already know? Use check_knowledge_graph and search_briefing_history to verify you're not repeating yourself. Don't waste their time with things they're expert in, unless the development is genuinely new.
3. RELEVANCE — Does this connect to their role, initiatives, concerns, or tracked topics? The stronger the connection, the better. Use check_expertise_gaps to find signals that fill knowledge gaps.
4. MOMENTUM — Is this topic gaining or losing public attention? Use query_google_trends to check whether key terms are surging, stable, or fading. A signal about a rising trend is more valuable than one about something peaking or declining.
5. COHERENCE — Use cross_reference_signals to find compound narratives (signals that combine into a bigger story) and eliminate redundancies. A briefing that tells a coherent story across its items is better than ${targetCount} disconnected facts.
6. DIVERSITY — Cover different areas of their interest rather than ${targetCount} signals about the same thing.
7. FEEDBACK ALIGNMENT — Use check_feedback_history to honor their tune-more and tune-less signals.

IT IS BETTER TO SELECT FEWER THAN ${targetCount} SIGNALS than to pad the briefing with filler. If only 2 of ${candidateCount} candidates clear the bar, select 2. An empty slot is better than a weak one.

SIGNAL LAYERS — Candidates come from multiple ingestion layers:
- "ai-research": LLM-generated research signals
- "news": Real-world news articles from NewsAPI.ai (150K+ global sources). These signals include sentiment metadata (a single -1 to +1 score) and detected entity concepts. Use sentiment to reason about shifts — e.g., "sentiment around X is turning negative". News signals include article body text (not just titles), so they carry richer context than other layers. When a news signal corroborates or contradicts signals from other layers, note this as evidence for or against selection.
- Other layers: syndication, research, events, narrative, personal-graph, email-forward

You have many tools available. ALWAYS call check_today_meetings first. Beyond that, use your judgment about which tools are worth calling for this particular set of candidates. Be ruthless. Every signal you include is asking the user to spend 10 seconds of their morning on it. If it's not worth 10 seconds, cut it. A 2-item briefing of genuinely important things beats a 5-item briefing padded with fluff.

ATTRIBUTION: For each selection, you MUST provide an "attribution" explaining why this signal matters to THIS specific user. Ground each attribution in concrete profile data — their impress list names, peer org names, specific knowledge gaps, current initiatives, meeting attendees, or feedback history. The attribution will be shown to the user so they understand why the item was included. Bad: "Relevant to your industry." Good: "Acme Corp is on your impress list and just announced a leadership change." Good: "You flagged parametric modeling as a knowledge gap — this is a primer on the latest approaches."

${TOOL_DEFINITIONS}`;
}

function buildCandidateList(signals: CandidateSignal[]): string {
  return signals
    .map(
      (s, i) =>
        `[${i}] ${s.title}\n    ${s.summary}${s.sourceLabel ? ` (${s.sourceLabel})` : ""}`
    )
    .join("\n\n");
}

// --- Tool implementations ---

async function executeCheckKnowledgeGraph(
  userId: string,
  args: { query?: string }
): Promise<unknown> {
  const entities = await db
    .select({
      name: knowledgeEntities.name,
      entityType: knowledgeEntities.entityType,
      description: knowledgeEntities.description,
      confidence: knowledgeEntities.confidence,
      source: knowledgeEntities.source,
    })
    .from(knowledgeEntities)
    .where(eq(knowledgeEntities.userId, userId));

  if (!args.query) {
    return {
      totalKnownEntities: entities.length,
      entities: entities.slice(0, 30),
    };
  }

  const queryLower = args.query.toLowerCase();
  const matches = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(queryLower) ||
      e.description.toLowerCase().includes(queryLower)
  );

  if (matches.length > 0) {
    return { query: args.query, matches, matchCount: matches.length };
  }

  // Fallback: embed-based search if no text matches
  const [queryEmb] = await embed([args.query]);
  if (!queryEmb) return { query: args.query, matches: [], matchCount: 0 };

  const entitiesWithEmbeddings = await db
    .select()
    .from(knowledgeEntities)
    .where(eq(knowledgeEntities.userId, userId));

  const scored = entitiesWithEmbeddings
    .filter((e) => e.embedding && (e.embedding as number[]).length > 0)
    .map((e) => ({
      name: e.name,
      entityType: e.entityType,
      description: e.description,
      confidence: e.confidence,
      similarity: cosineSimilarity(queryEmb, e.embedding as number[]),
    }))
    .filter((e) => e.similarity > 0.6)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);

  return { query: args.query, matches: scored, matchCount: scored.length };
}

async function executeCheckFeedbackHistory(userId: string): Promise<unknown> {
  const feedback = await db
    .select()
    .from(feedbackSignals)
    .where(eq(feedbackSignals.userId, userId))
    .orderBy(desc(feedbackSignals.createdAt))
    .limit(30);

  const tuneMore = feedback.filter((f) => f.type === "tune-more");
  const tuneLess = feedback.filter((f) => f.type === "tune-less");
  const notNovel = feedback.filter((f) => f.type === "not-novel");
  const deepDives = feedback.filter((f) => f.type === "deep-dive");

  return {
    totalFeedbackSignals: feedback.length,
    tuneMore: tuneMore.map((f) => ({ topic: f.topic, comment: f.comment })),
    tuneLess: tuneLess.map((f) => ({ topic: f.topic, comment: f.comment })),
    notNovel: notNovel.map((f) => ({ topic: f.topic })),
    deepDives: deepDives.map((f) => ({ topic: f.topic })),
  };
}

async function executeCompareWithPeers(
  userId: string,
  signals: CandidateSignal[],
  args: { signal_indices?: number[] }
): Promise<unknown> {
  const peers = await db
    .select()
    .from(peerOrganizations)
    .where(eq(peerOrganizations.userId, userId));

  const contacts = await db
    .select()
    .from(impressContacts)
    .where(eq(impressContacts.userId, userId));

  const peerNames = peers.map((p) => p.name.toLowerCase());
  const contactNames = contacts
    .filter((c) => c.name)
    .map((c) => c.name!.toLowerCase());

  const contactInterestMap = new Map<string, string[]>();
  for (const c of contacts) {
    if (!c.name) continue;
    const dd = c.deepDiveData as { interests?: string[]; focusAreas?: string[] } | null;
    if (dd) {
      const terms = [...(dd.interests || []), ...(dd.focusAreas || [])];
      contactInterestMap.set(c.name.toLowerCase(), terms.map((t) => t.toLowerCase()));
    }
  }

  const indices = args.signal_indices ?? signals.map((_, i) => i);
  const results = indices.map((idx) => {
    const signal = signals[idx];
    if (!signal) return { signalIndex: idx, error: "invalid index" };
    const text = `${signal.title} ${signal.summary}`.toLowerCase();
    const matchedPeers = peerNames.filter((p) => text.includes(p));
    const matchedContacts = contactNames.filter((c) => text.includes(c));

    const matchedInterests: { contact: string; matchedTopics: string[] }[] = [];
    for (const [contactName, interests] of contactInterestMap) {
      const matched = interests.filter((interest) => text.includes(interest));
      if (matched.length > 0) {
        matchedInterests.push({ contact: contactName, matchedTopics: matched });
      }
    }

    return {
      signalIndex: idx,
      matchedPeerOrgs: matchedPeers,
      matchedImpressContacts: matchedContacts,
      matchedImpressInterests: matchedInterests,
      hasPeerRelevance:
        matchedPeers.length > 0 ||
        matchedContacts.length > 0 ||
        matchedInterests.length > 0,
    };
  });

  return {
    trackedPeerOrgs: peers.map((p) => p.name),
    trackedContacts: contacts.map((c) => {
      const dd = c.deepDiveData as {
        interests?: string[];
        focusAreas?: string[];
        talkingPoints?: string[];
      } | null;
      return {
        name: c.name,
        title: c.title,
        company: c.company,
        deepDiveAvailable: c.researchStatus === "completed" && !!dd,
        ...(dd
          ? {
              interests: dd.interests || [],
              focusAreas: dd.focusAreas || [],
              talkingPoints: dd.talkingPoints || [],
            }
          : {}),
      };
    }),
    signalMatches: results,
  };
}

async function executeAssessFreshness(userId: string): Promise<unknown> {
  const recentBriefings = await db
    .select()
    .from(briefings)
    .where(eq(briefings.userId, userId))
    .orderBy(desc(briefings.generatedAt))
    .limit(3);

  if (recentBriefings.length === 0) {
    return { lastBriefing: null, message: "No previous briefings — everything is novel." };
  }

  const last = recentBriefings[0]!;
  const items = last.items as { topic: string; content: string }[];
  return {
    lastBriefingAt: last.generatedAt,
    topicsCovered: items.map((item) => item.topic),
    briefingCount: recentBriefings.length,
    recentTopics: recentBriefings.flatMap(
      (b) => (b.items as { topic: string }[]).map((i) => i.topic)
    ),
  };
}

async function executeWebSearch(args: { query?: string }): Promise<unknown> {
  if (!args.query) return { error: "query is required" };

  // Use OpenAI's web search or a research provider when available.
  // For now, synthesize via the LLM with a web-search instruction.
  const response = await chat(
    [
      {
        role: "system",
        content:
          "You are a research assistant. Given a query, provide a brief factual summary of the latest information you know. Be concise — 2-3 sentences max. If you're unsure, say so.",
      },
      { role: "user", content: args.query },
    ],
    { model: "gpt-4o-mini", temperature: 0.2, maxTokens: 256 }
  );

  return { query: args.query, summary: response.content };
}

interface GoogleTrendsArgs {
  keywords?: string[];
  timeframe?: "past_day" | "past_week" | "past_month" | "past_year";
  geo?: string;
}

function serpApiDateParam(timeframe: string): string {
  switch (timeframe) {
    case "past_day":
      return "now 1-d";
    case "past_week":
      return "now 7-d";
    case "past_year":
      return "today 12-m";
    case "past_month":
    default:
      return "today 1-m";
  }
}

interface TrendsTimelineDataPoint {
  time: string;
  formattedTime: string;
  value: number[];
  hasData: boolean[];
  formattedValue: string[];
}


function summarizeTrend(timelineData: TrendsTimelineDataPoint[], keywordIndex: number): {
  direction: "rising" | "falling" | "stable";
  recentAvg: number;
  olderAvg: number;
  peak: number;
} {
  if (!timelineData || timelineData.length === 0) {
    return { direction: "stable", recentAvg: 0, olderAvg: 0, peak: 0 };
  }

  const values = timelineData.map((d) => d.value[keywordIndex] ?? 0);
  const midpoint = Math.floor(values.length / 2);
  const olderHalf = values.slice(0, midpoint);
  const recentHalf = values.slice(midpoint);

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  const olderAvg = avg(olderHalf);
  const recentAvg = avg(recentHalf);
  const peak = Math.max(...values);

  const changePct = olderAvg === 0 ? (recentAvg > 0 ? 100 : 0) : ((recentAvg - olderAvg) / olderAvg) * 100;

  let direction: "rising" | "falling" | "stable";
  if (changePct > 15) direction = "rising";
  else if (changePct < -15) direction = "falling";
  else direction = "stable";

  return { direction, recentAvg: Math.round(recentAvg), olderAvg: Math.round(olderAvg), peak };
}

async function executeQueryGoogleTrends(args: GoogleTrendsArgs): Promise<unknown> {
  const keywords = args.keywords;
  if (!keywords || keywords.length === 0) {
    return { error: "keywords array is required and must not be empty" };
  }

  if (!SERPAPI_KEY) {
    return {
      error: "Google Trends unavailable — SERPAPI_API_KEY not configured",
      keywords: keywords.slice(0, 5),
    };
  }

  const cappedKeywords = keywords.slice(0, 5);
  const timeframe = args.timeframe ?? "past_month";
  const dateParam = serpApiDateParam(timeframe);
  const geo = args.geo ?? "";
  const query = cappedKeywords.join(",");

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_trends");
    url.searchParams.set("q", query);
    url.searchParams.set("data_type", "TIMESERIES");
    url.searchParams.set("date", dateParam);
    if (geo) url.searchParams.set("geo", geo);
    url.searchParams.set("api_key", SERPAPI_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) {
      return {
        error: "SerpAPI request failed",
        detail: `${res.status} ${res.statusText}`,
        keywords: cappedKeywords,
      };
    }

    const data = await res.json();
    const timelineData: TrendsTimelineDataPoint[] = (data.interest_over_time?.timeline_data ?? []).map(
      (d: { date: string; timestamp: string; values: { query: string; value: string; extracted_value: number }[] }) => ({
        time: d.timestamp,
        formattedTime: d.date,
        value: d.values.map((v) => v.extracted_value),
        hasData: d.values.map((v) => v.extracted_value > 0),
        formattedValue: d.values.map((v) => v.value),
      })
    );

    const keywordSummaries = cappedKeywords.map((kw, i) => ({
      keyword: kw,
      averageInterest: timelineData.length > 0
        ? Math.round(timelineData.reduce((sum, d) => sum + (d.value[i] ?? 0), 0) / timelineData.length)
        : 0,
      ...summarizeTrend(timelineData, i),
    }));

    // Related queries — separate call per keyword (best effort)
    const relatedData: Record<string, { top: string[]; rising: string[] }> = {};
    for (const kw of cappedKeywords) {
      try {
        const rUrl = new URL("https://serpapi.com/search.json");
        rUrl.searchParams.set("engine", "google_trends");
        rUrl.searchParams.set("q", kw);
        rUrl.searchParams.set("data_type", "RELATED_QUERIES");
        rUrl.searchParams.set("date", dateParam);
        if (geo) rUrl.searchParams.set("geo", geo);
        rUrl.searchParams.set("api_key", SERPAPI_KEY);

        const rRes = await fetch(rUrl.toString());
        if (rRes.ok) {
          const rData = await rRes.json();
          const topQueries = (rData.related_queries?.top ?? []).slice(0, 5).map(
            (q: { query: string }) => q.query
          );
          const risingQueries = (rData.related_queries?.rising ?? []).slice(0, 5).map(
            (q: { query: string }) => q.query
          );
          relatedData[kw] = { top: topQueries, rising: risingQueries };
        }
      } catch {
        // Individual related-query failures are non-fatal
      }
    }

    return {
      keywords: cappedKeywords,
      timeframe,
      geo: geo || "worldwide",
      trends: keywordSummaries,
      relatedQueries: relatedData,
      dataPoints: timelineData.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: "Google Trends query failed",
      detail: message,
      keywords: cappedKeywords,
    };
  }
}

// --- Today's meetings tool ---

function getTodayBounds(timezone: string | null): { start: Date; end: Date } {
  const now = new Date();
  // Use a rough UTC offset if we can't parse the timezone properly
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  // Extend window by 24h in both directions to account for timezone differences
  start.setHours(start.getHours() - 14);
  end.setHours(end.getHours() + 14);
  return { start, end };
}

async function executeCheckTodayMeetings(userId: string): Promise<unknown> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const timezone = profile?.deliveryTimezone ?? null;
  const { start, end } = getTodayBounds(timezone);

  // Query actual meetings for today/tomorrow window
  const todayMeetings = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        gte(meetings.startTime, start),
        lte(meetings.startTime, end)
      )
    )
    .orderBy(meetings.startTime);

  if (todayMeetings.length === 0) {
    return {
      hasMeetings: false,
      timezone: timezone ?? "unknown",
      meetings: [],
      message: "No meetings found for today. Meeting-prep signals are not prioritized.",
    };
  }

  // Load impress list and recent meeting history for attendee prioritization
  const impressList = await db
    .select()
    .from(impressContacts)
    .where(eq(impressContacts.userId, userId));
  const impressNames = new Set(
    impressList.filter((c) => c.name).map((c) => c.name!.toLowerCase())
  );
  const impressCompanies = new Set(
    impressList.filter((c) => c.company).map((c) => c.company!.toLowerCase())
  );

  // Check how often we've seen each meeting title recently (recurring detection)
  const recentMeetingTitles = await db
    .select({ title: meetings.title })
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        gte(meetings.startTime, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      )
    );
  const titleFrequency: Record<string, number> = {};
  for (const m of recentMeetingTitles) {
    const key = m.title.toLowerCase();
    titleFrequency[key] = (titleFrequency[key] ?? 0) + 1;
  }

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const userCompany = currentUser?.company?.toLowerCase() ?? "";

  // Load attendees and classify each one
  const meetingDetails = await Promise.all(
    todayMeetings.map(async (mtg) => {
      const attendees = await db
        .select()
        .from(meetingAttendees)
        .where(eq(meetingAttendees.meetingId, mtg.id));

      const [intel] = await db
        .select()
        .from(meetingIntelligence)
        .where(eq(meetingIntelligence.meetingId, mtg.id))
        .limit(1);

      const isRecurring = (titleFrequency[mtg.title.toLowerCase()] ?? 0) > 2;

      const classifiedAttendees = attendees.map((a) => {
        const name = a.name?.toLowerCase() ?? "";
        const title = a.title?.toLowerCase() ?? "";
        const company = a.company?.toLowerCase() ?? "";

        const isOnImpressList =
          impressNames.has(name) ||
          (a.linkedinUrl
            ? impressList.some((ic) => ic.linkedinUrl === a.linkedinUrl)
            : false);

        const isSenior =
          /\b(c[eost]o|cfo|cio|cmo|cro|cto|chief|president|founder|partner|managing director|vp |vice president|svp|evp|head of|director|general manager|gm)\b/i.test(
            title
          );

        const isExternal = !!(company && company !== userCompany);
        const isInternal = !!(company && company === userCompany);

        let prepPriority: "high" | "medium" | "low" | "skip";
        if (isOnImpressList) {
          prepPriority = "high";
        } else if (isSenior && isInternal) {
          prepPriority = "high";
        } else if (isSenior && isExternal) {
          prepPriority = "medium";
        } else if (isExternal) {
          prepPriority = "medium";
        } else {
          prepPriority = "low";
        }

        return {
          name: a.name,
          email: a.email,
          title: a.title,
          company: a.company,
          linkedinUrl: a.linkedinUrl,
          enriched: a.enriched,
          enrichmentData: a.enrichmentData,
          classification: {
            isOnImpressList,
            isSenior,
            isExternal,
            isInternal,
            prepPriority,
          },
        };
      });

      const highPriorityAttendees = classifiedAttendees.filter(
        (a) => a.classification.prepPriority === "high"
      );
      const hasHighPriorityAttendees = highPriorityAttendees.length > 0;

      // Meeting is worth prepping for if it has high-priority attendees and isn't a daily standup
      const meetingPrepWorthiness =
        hasHighPriorityAttendees && !isRecurring
          ? "high"
          : hasHighPriorityAttendees && isRecurring
            ? "medium"
            : !isRecurring
              ? "low"
              : "skip";

      return {
        meetingId: mtg.id,
        title: mtg.title,
        startTime: mtg.startTime,
        endTime: mtg.endTime,
        description: mtg.description,
        location: mtg.location,
        isVirtual: mtg.isVirtual,
        isRecurring,
        meetingPrepWorthiness,
        attendees: classifiedAttendees,
        highPriorityAttendees: highPriorityAttendees.map((a) => ({
          name: a.name,
          title: a.title,
          company: a.company,
          reason: a.classification.isOnImpressList
            ? "on impress list"
            : a.classification.isInternal
              ? "senior internal"
              : "senior external",
        })),
        intelligence: intel
          ? {
              relevantTopics: intel.relevantTopics,
              suggestedTalkingPoints: intel.suggestedTalkingPoints,
              attendeeSummaries: intel.attendeeSummaries,
            }
          : null,
      };
    })
  );

  // Only extract matching hints from meetings worth prepping for
  const prepWorthyMeetings = meetingDetails.filter(
    (m) => m.meetingPrepWorthiness === "high" || m.meetingPrepWorthiness === "medium"
  );

  const highPriorityCompanies = [
    ...new Set(
      prepWorthyMeetings
        .flatMap((m) =>
          m.attendees.filter(
            (a) =>
              a.classification.prepPriority === "high" ||
              a.classification.prepPriority === "medium"
          )
        )
        .map((a) => a.company)
        .filter((c): c is string => c !== null && c.length > 0)
    ),
  ];

  const highPriorityPeople = [
    ...new Set(
      prepWorthyMeetings
        .flatMap((m) =>
          m.attendees.filter(
            (a) =>
              a.classification.prepPriority === "high" ||
              a.classification.prepPriority === "medium"
          )
        )
        .map((a) => a.name)
        .filter((n): n is string => n !== null && n.length > 0)
    ),
  ];

  const allRelevantTopics = [
    ...new Set(
      prepWorthyMeetings
        .filter((m) => m.intelligence)
        .flatMap((m) => m.intelligence!.relevantTopics)
    ),
  ];

  return {
    hasMeetings: true,
    timezone: timezone ?? "unknown",
    meetingCount: todayMeetings.length,
    prepWorthyMeetingCount: prepWorthyMeetings.length,
    meetings: meetingDetails,
    matchingHints: {
      companies: highPriorityCompanies,
      people: highPriorityPeople,
      topics: allRelevantTopics,
      instruction:
        "Only prep for meetings with HIGH or MEDIUM prep worthiness. Focus research on HIGH-priority attendees (impress list, senior external). Do NOT research junior staff or people from recurring standups. Meeting-prep signals should use AT MOST 3 of the 5 briefing slots — leave room for other important signals.",
    },
  };
}

// --- Research meeting attendees tool ---

async function executeResearchMeetingAttendees(
  userId: string,
  args: { meeting_id?: string }
): Promise<unknown> {
  // If no meeting_id, research the next upcoming meeting
  let targetMeeting: typeof meetings.$inferSelect | null = null;

  if (args.meeting_id) {
    const [mtg] = await db
      .select()
      .from(meetings)
      .where(and(eq(meetings.id, args.meeting_id), eq(meetings.userId, userId)))
      .limit(1);
    targetMeeting = mtg ?? null;
  } else {
    const now = new Date();
    const [mtg] = await db
      .select()
      .from(meetings)
      .where(and(eq(meetings.userId, userId), gte(meetings.startTime, now)))
      .orderBy(meetings.startTime)
      .limit(1);
    targetMeeting = mtg ?? null;
  }

  if (!targetMeeting) {
    return { error: "No matching meeting found.", meetingId: args.meeting_id ?? null };
  }

  const allAttendees = await db
    .select()
    .from(meetingAttendees)
    .where(eq(meetingAttendees.meetingId, targetMeeting.id));

  if (allAttendees.length === 0) {
    return {
      meetingId: targetMeeting.id,
      title: targetMeeting.title,
      message: "No attendees found for this meeting.",
    };
  }

  // Load impress list to identify who matters
  const impressList = await db
    .select()
    .from(impressContacts)
    .where(eq(impressContacts.userId, userId));
  const impressNames = new Set(
    impressList.filter((c) => c.name).map((c) => c.name!.toLowerCase())
  );

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const userCompany = user?.company?.toLowerCase() ?? "";

  // Classify and filter — only research people worth researching
  const researchWorthy = allAttendees.filter((a) => {
    const name = a.name?.toLowerCase() ?? "";
    const title = a.title?.toLowerCase() ?? "";
    const company = a.company?.toLowerCase() ?? "";

    const isOnImpressList =
      impressNames.has(name) ||
      (a.linkedinUrl
        ? impressList.some((ic) => ic.linkedinUrl === a.linkedinUrl)
        : false);
    if (isOnImpressList) return true;

    const isSenior =
      /\b(c[eost]o|cfo|cio|cmo|cro|cto|chief|president|founder|partner|managing director|vp |vice president|svp|evp|head of|director|general manager|gm)\b/i.test(
        title
      );
    if (isSenior) return true;

    // External non-junior people are worth a look
    const isExternal = !!(company && company !== userCompany);
    const isJunior =
      /\b(intern|associate|analyst|coordinator|assistant|junior|jr\.?)\b/i.test(title);
    if (isExternal && !isJunior) return true;

    return false;
  });

  const skippedCount = allAttendees.length - researchWorthy.length;

  const attendeeDescriptions = researchWorthy.map((a) => {
    const parts = [a.name ?? "Unknown"];
    if (a.title) parts.push(`(${a.title})`);
    if (a.company) parts.push(`at ${a.company}`);
    if (a.linkedinUrl) parts.push(`— LinkedIn: ${a.linkedinUrl}`);
    if (a.enriched && a.enrichmentData) {
      const data = a.enrichmentData as {
        headline: string | null;
        skills: string[];
        recentActivity: string[];
        topicsTheyCareAbout: string[];
      };
      if (data.headline) parts.push(`Headline: ${data.headline}`);
      if (data.skills.length > 0) parts.push(`Skills: ${data.skills.join(", ")}`);
      if (data.topicsTheyCareAbout.length > 0)
        parts.push(`Interested in: ${data.topicsTheyCareAbout.join(", ")}`);
    }

    const isOnImpressList =
      impressNames.has((a.name ?? "").toLowerCase()) ||
      (a.linkedinUrl
        ? impressList.some((ic) => ic.linkedinUrl === a.linkedinUrl)
        : false);
    if (isOnImpressList) parts.push("[ON IMPRESS LIST — prioritize]");

    return parts.join(" ");
  });

  if (researchWorthy.length === 0) {
    return {
      meetingId: targetMeeting.id,
      title: targetMeeting.title,
      totalAttendees: allAttendees.length,
      message:
        "No high-priority attendees found for this meeting (no impress-list contacts or senior people). Skipping deep research.",
    };
  }

  const response = await chat(
    [
      {
        role: "system",
        content: `You are a meeting intelligence analyst. Given a meeting and its KEY attendees (junior/low-priority attendees have been filtered out), produce a concise research briefing. Focus on:

1. WHO — For each attendee: their role, what their company does, what they likely care about, any recent moves or news about their company. Pay special attention to anyone marked [ON IMPRESS LIST].
2. WHY IT MATTERS — What's the likely agenda or purpose of this meeting given the attendee mix?
3. TALKING POINTS — 3-5 specific topics or questions that would make the user sound informed and prepared, especially in front of impress-list contacts.
4. LANDMINES — Anything the user should be careful about (competitor relationships, sensitive topics, recent controversies).
5. SIGNAL KEYWORDS — A list of 5-10 keywords/terms that, if they appear in today's news signals, would be highly relevant to this meeting. Focus on the companies and industries of the most important attendees.

Return valid JSON with these exact keys: { "attendeeProfiles": [{ "name": "...", "role": "...", "company": "...", "isOnImpressList": bool, "whatTheyCareAbout": ["..."], "recentCompanyNews": "..." }], "meetingPurpose": "...", "talkingPoints": ["..."], "landmines": ["..."], "signalKeywords": ["..."] }`,
      },
      {
        role: "user",
        content: `Meeting: "${targetMeeting.title}"
Time: ${targetMeeting.startTime}
Description: ${targetMeeting.description || "No description"}
${user ? `Your role: ${user.title || "Professional"} at ${user.company || "your company"}` : ""}

Key attendees (${researchWorthy.length} of ${allAttendees.length} total — ${skippedCount} junior/low-priority attendees filtered out):
${attendeeDescriptions.join("\n")}`,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.3, maxTokens: 2048 }
  );

  let research: Record<string, unknown>;
  try {
    research = JSON.parse(response.content);
  } catch {
    research = { rawAnalysis: response.content };
  }

  return {
    meetingId: targetMeeting.id,
    title: targetMeeting.title,
    startTime: targetMeeting.startTime,
    totalAttendees: allAttendees.length,
    researchedAttendees: researchWorthy.length,
    skippedAttendees: skippedCount,
    research,
  };
}

// --- Briefing history search tool ---

async function executeSearchBriefingHistory(
  userId: string,
  args: { query?: string; limit?: number }
): Promise<unknown> {
  const maxResults = Math.min(args.limit ?? 10, 20);

  const allBriefings = await db
    .select()
    .from(briefings)
    .where(eq(briefings.userId, userId))
    .orderBy(desc(briefings.generatedAt))
    .limit(30);

  if (allBriefings.length === 0) {
    return { results: [], message: "No briefing history found." };
  }

  type BriefingItem = {
    id: string;
    reason: string;
    reasonLabel: string;
    topic: string;
    content: string;
  };

  if (!args.query) {
    const recentItems = allBriefings.slice(0, 5).flatMap((b) => {
      const items = b.items as BriefingItem[];
      return items.map((item) => ({
        topic: item.topic,
        reason: item.reason,
        content: item.content,
        briefingDate: b.generatedAt,
      }));
    });
    return {
      totalBriefings: allBriefings.length,
      recentItems: recentItems.slice(0, maxResults),
    };
  }

  const queryLower = args.query.toLowerCase();
  const matchingItems: {
    topic: string;
    reason: string;
    content: string;
    briefingDate: Date;
  }[] = [];

  for (const b of allBriefings) {
    const items = b.items as BriefingItem[];
    for (const item of items) {
      const text = `${item.topic} ${item.content}`.toLowerCase();
      if (text.includes(queryLower)) {
        matchingItems.push({
          topic: item.topic,
          reason: item.reason,
          content: item.content,
          briefingDate: b.generatedAt,
        });
      }
    }
    if (matchingItems.length >= maxResults) break;
  }

  return {
    query: args.query,
    totalBriefings: allBriefings.length,
    matchingItems: matchingItems.slice(0, maxResults),
    matchCount: matchingItems.length,
  };
}

// --- Cross-reference signals tool ---

async function executeCrossReferenceSignals(
  signals: CandidateSignal[],
  args: { signal_indices?: number[] }
): Promise<unknown> {
  const indices = args.signal_indices ?? signals.map((_, i) => i);
  const selected = indices
    .filter((i) => i >= 0 && i < signals.length)
    .map((i) => ({ index: i, signal: signals[i]! }));

  if (selected.length < 2) {
    return { error: "Need at least 2 signal indices to cross-reference." };
  }

  const signalTexts = selected.map(
    (s) => `[${s.index}] ${s.signal.title}: ${s.signal.summary}`
  );

  const response = await chat(
    [
      {
        role: "system",
        content: `You are an analyst looking for connections between intelligence signals. Given a set of signals, identify:
1. Thematic clusters — which signals are about the same underlying trend or event?
2. Contradictions — do any signals present conflicting information?
3. Compound narratives — do any signals combine to tell a bigger story than each one individually?
4. Redundancies — are any signals essentially duplicates that shouldn't both appear in a briefing?

Be concise. Return a JSON object with: { "clusters": [{ "indices": [numbers], "theme": "..." }], "contradictions": [{ "indices": [numbers], "description": "..." }], "compoundNarratives": [{ "indices": [numbers], "narrative": "..." }], "redundancies": [{ "indices": [numbers], "keepIndex": number }] }`,
      },
      {
        role: "user",
        content: signalTexts.join("\n\n"),
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.2, maxTokens: 1024 }
  );

  try {
    return JSON.parse(response.content);
  } catch {
    return { analysis: response.content };
  }
}

// --- Expertise gaps tool ---

async function executeCheckExpertiseGaps(
  userId: string,
  signals: CandidateSignal[],
  args: { signal_indices?: number[] }
): Promise<unknown> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile) return { error: "No profile found." };

  const weakAreas = toStringArray(profile.parsedWeakAreas);
  const knowledgeGaps = toStringArray(profile.parsedKnowledgeGaps);
  const expertAreas = toStringArray(profile.parsedExpertAreas);

  const gapTerms = [...weakAreas, ...knowledgeGaps].map((t) => t.toLowerCase());
  const expertTerms = expertAreas.map((t) => t.toLowerCase());

  const indices = args.signal_indices ?? signals.map((_, i) => i);
  const results = indices
    .filter((i) => i >= 0 && i < signals.length)
    .map((idx) => {
      const signal = signals[idx]!;
      const text = `${signal.title} ${signal.summary}`.toLowerCase();

      const matchedGaps = gapTerms.filter((g) => text.includes(g));
      const matchedExpertise = expertTerms.filter((e) => text.includes(e));

      return {
        signalIndex: idx,
        fillsKnowledgeGap: matchedGaps.length > 0,
        matchedGaps,
        coversExpertArea: matchedExpertise.length > 0,
        matchedExpertise,
        educationalValue:
          matchedGaps.length > 0 && matchedExpertise.length === 0
            ? "high"
            : matchedGaps.length > 0
              ? "medium"
              : "low",
      };
    });

  return {
    userWeakAreas: weakAreas,
    userKnowledgeGaps: knowledgeGaps,
    userExpertAreas: expertAreas,
    signalAnalysis: results,
    highValueCount: results.filter((r) => r.educationalValue === "high").length,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// --- Signal provenance tool ---

async function executeGetSignalProvenance(
  userId: string,
  signals: CandidateSignal[],
  args: { signal_indices?: number[] }
): Promise<unknown> {
  const indices = args.signal_indices ?? signals.map((_, i) => i);

  const results = indices.map((idx) => {
    const signal = signals[idx];
    if (!signal) return { signalIndex: idx, error: "invalid index" };

    const isUserCurated = (signal as CandidateSignal & { layer?: string }).layer === "email-forward";
    const metadata = (signal as CandidateSignal & { metadata?: Record<string, string> }).metadata;

    if (isUserCurated) {
      return {
        signalIndex: idx,
        provenanceType: "user-curated",
        provenanceScore: 1.0,
        userAnnotation: metadata?.userAnnotation ?? null,
        note: "User explicitly forwarded this content — maximum provenance weight.",
      };
    }

    return {
      signalIndex: idx,
      provenanceType: "standard",
      provenanceScore: null,
      note: "Provenance data not available for AI-generated signals in current pipeline.",
    };
  });

  return { signalProvenance: results };
}

// --- Agent loop ---

async function executeTool(
  toolName: AgentToolName,
  args: Record<string, unknown>,
  userId: string,
  signals: CandidateSignal[]
): Promise<unknown> {
  switch (toolName) {
    case "check_knowledge_graph":
      return executeCheckKnowledgeGraph(userId, args as { query?: string });
    case "check_feedback_history":
      return executeCheckFeedbackHistory(userId);
    case "compare_with_peers":
      return executeCompareWithPeers(userId, signals, args as { signal_indices?: number[] });
    case "get_signal_provenance":
      return executeGetSignalProvenance(userId, signals, args as { signal_indices?: number[] });
    case "assess_freshness":
      return executeAssessFreshness(userId);
    case "web_search":
      return executeWebSearch(args as { query?: string });
    case "query_google_trends":
      return executeQueryGoogleTrends(args as GoogleTrendsArgs);
    case "check_today_meetings":
      return executeCheckTodayMeetings(userId);
    case "research_meeting_attendees":
      return executeResearchMeetingAttendees(userId, args as { meeting_id?: string });
    case "search_briefing_history":
      return executeSearchBriefingHistory(userId, args as { query?: string; limit?: number });
    case "cross_reference_signals":
      return executeCrossReferenceSignals(signals, args as { signal_indices?: number[] });
    case "check_expertise_gaps":
      return executeCheckExpertiseGaps(userId, signals, args as { signal_indices?: number[] });
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

function parseToolCall(
  content: string
): { tool: AgentToolName; args: Record<string, unknown> } | null {
  const trimmed = content.trim();

  // Try parsing as direct JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.tool && typeof parsed.tool === "string") {
      return { tool: parsed.tool as AgentToolName, args: parsed.args ?? {} };
    }
  } catch {
    // Not direct JSON — try extracting from markdown code block
  }

  const jsonMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.tool && typeof parsed.tool === "string") {
        return { tool: parsed.tool as AgentToolName, args: parsed.args ?? {} };
      }
    } catch {
      // Could not parse
    }
  }

  return null;
}

function parseSelections(args: Record<string, unknown>): SignalSelection[] | null {
  const raw = args.selections;
  if (!Array.isArray(raw)) return null;

  return raw.map((s: Record<string, unknown>) => ({
    signalIndex: Number(s.signalIndex ?? s.signal_index ?? -1),
    reason: String(s.reason ?? "other"),
    reasonLabel: String(s.reasonLabel ?? s.reason_label ?? ""),
    confidence: Number(s.confidence ?? 0.5),
    noveltyAssessment: String(s.noveltyAssessment ?? s.novelty_assessment ?? ""),
    attribution: String(s.attribution ?? ""),
    toolsUsed: [],
  }));
}

export const DEFAULT_AGENT_CONFIG: AgentScoringConfig = {
  model: "gpt-5.2",
  temperature: 0.4,
  maxToolRounds: 10,
  targetSelections: 5,
  candidatePoolSize: 30,
};

export async function runScoringAgent(
  userId: string,
  candidates: CandidateSignal[],
  config: AgentScoringConfig = DEFAULT_AGENT_CONFIG
): Promise<AgentScoringResult | null> {
  const ulog = log.child({ userId });
  const start = Date.now();
  ulog.info({ candidateCount: candidates.length, model: config.model, maxRounds: config.maxToolRounds, targetSelections: config.targetSelections }, "Scoring agent started");

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
    ulog.error({ hasUser: !!user, hasProfile: !!profile }, "User or profile not found — cannot score");
    return null;
  }

  const userContext: UserContext = {
    name: user.name,
    title: user.title,
    company: user.company,
    topics: toStringArray(profile.parsedTopics),
    initiatives: toStringArray(profile.parsedInitiatives),
    concerns: toStringArray(profile.parsedConcerns),
    weakAreas: toStringArray(profile.parsedWeakAreas),
    expertAreas: toStringArray(profile.parsedExpertAreas),
    knowledgeGaps: toStringArray(profile.parsedKnowledgeGaps),
    rapidFireClassifications:
      (profile.rapidFireClassifications as { topic: string; context: string; response: string }[]) || [],
    deliveryChannel: profile.deliveryChannel,
  };

  const pool = candidates.slice(0, config.candidatePoolSize);
  const systemPrompt = buildSystemPrompt(userContext, pool.length, config.targetSelections);
  const candidateList = buildCandidateList(pool);

  const messages: LlmMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Here are today's candidate signals. Select the top ${config.targetSelections}.\n\n${candidateList}`,
    },
  ];

  const toolCallLog: AgentScoringResult["toolCallLog"] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  const toolsUsedPerRound: AgentToolName[] = [];

  for (let round = 0; round < config.maxToolRounds; round++) {
    let response;
    try {
      response = await chat(messages, {
        model: config.model,
        temperature: config.temperature,
        maxTokens: 4096,
      });
    } catch (err) {
      ulog.error({ err, round: round + 1 }, "LLM call failed in scoring round");
      break;
    }
    totalPromptTokens += response.promptTokens;
    totalCompletionTokens += response.completionTokens;

    const toolCall = parseToolCall(response.content);

    if (!toolCall) {
      // No tool call found — the agent responded with text. Push as assistant and
      // prompt it to finalize via submit_selections.
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content:
          "Please finalize your selections by calling the submit_selections tool.",
      });
      continue;
    }

    ulog.debug({ round: round + 1, tool: toolCall.tool }, "Agent tool call");

    if (toolCall.tool === "submit_selections") {
      const selections = parseSelections(toolCall.args);
      if (!selections || selections.length === 0) {
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content:
            "Your submit_selections call was malformed. Please try again with the correct format.",
        });
        continue;
      }

      const enrichedSelections = selections.map((s) => ({
        ...s,
        toolsUsed: [...toolsUsedPerRound],
      }));

      ulog.info({ selections: enrichedSelections.length, rounds: round + 1, toolCalls: toolCallLog.length, totalMs: Date.now() - start, promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens }, "Scoring agent completed");

      return {
        userId,
        selections: enrichedSelections,
        reasoning: messages
          .filter((m) => m.role === "assistant")
          .map((m) => m.content)
          .join("\n\n"),
        toolCallLog,
        modelUsed: config.model,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        scoredAt: new Date().toISOString(),
      };
    }

    // Execute the tool and feed results back
    toolsUsedPerRound.push(toolCall.tool);
    const result = await executeTool(toolCall.tool, toolCall.args, userId, pool);

    toolCallLog.push({
      tool: toolCall.tool,
      args: toolCall.args,
      summary: JSON.stringify(result).slice(0, 500),
    });

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: `Tool result (${toolCall.tool}):\n${JSON.stringify(result, null, 2)}`,
    });
  }

  ulog.warn({ rounds: config.maxToolRounds, toolCalls: toolCallLog.length }, "Max tool rounds exhausted — forcing final selection");
  const forceResponse = await chat(
    [
      ...messages,
      {
        role: "user",
        content: `You've used all your tool rounds. You MUST now call submit_selections with your top ${config.targetSelections} picks based on what you've learned. Respond with ONLY the JSON tool call, no text.`,
      },
    ],
    { model: config.model, temperature: config.temperature, maxTokens: 4096 }
  );

  totalPromptTokens += forceResponse.promptTokens;
  totalCompletionTokens += forceResponse.completionTokens;

  const finalCall = parseToolCall(forceResponse.content);
  if (finalCall?.tool === "submit_selections") {
    const selections = parseSelections(finalCall.args);
    if (selections && selections.length > 0) {
      ulog.info({ selections: selections.length, totalMs: Date.now() - start }, "Scoring agent completed (forced)");
      return {
        userId,
        selections: selections.map((s) => ({ ...s, toolsUsed: [...toolsUsedPerRound] })),
        reasoning: messages
          .filter((m) => m.role === "assistant")
          .map((m) => m.content)
          .join("\n\n"),
        toolCallLog,
        modelUsed: config.model,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        scoredAt: new Date().toISOString(),
      };
    }
  }

  ulog.error({ totalMs: Date.now() - start, finalResponseSnippet: forceResponse.content.slice(0, 300) }, "Scoring agent failed — could not extract selections");
  return null;
}
