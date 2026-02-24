import { chat } from "../llm";
import { createLogger } from "../logger";
import type { ContentUniverse } from "../../models/content-universe";

const log = createLogger("ai-research:query-derivation");

export interface ResearchQueries {
  perplexityQueries: string[];
  tavilyQueries: string[];
}

interface ProfileContext {
  role: string;
  company: string;
  topics: string[];
  initiatives: string[];
  concerns: string[];
  knowledgeGaps: string[];
  impressListCompanies: string[];
  peerOrgNames: string[];
}

function deriveTemplateQueries(
  profile: ProfileContext,
  contentUniverse: ContentUniverse | null = null
): ResearchQueries {
  const perplexitySet = new Set<string>();
  const tavilySet = new Set<string>();

  const role = profile.role || "professional";
  const company = profile.company || "their company";
  const topicContext = contentUniverse
    ? contentUniverse.coreTopics.slice(0, 5).join(", ")
    : profile.topics.slice(0, 5).join(", ");
  const exclusionNote = contentUniverse?.exclusions.length
    ? ` Exclude anything about ${contentUniverse.exclusions.join(", ")}.`
    : "";

  // Core universe-driven queries — deep and specific
  if (contentUniverse) {
    for (const topic of contentUniverse.coreTopics) {
      perplexitySet.add(
        `A ${role} at ${company} works on ${topicContext}. What happened in ${topic} in the last 48 hours that they probably don't know yet but should? Be specific — names, numbers, deals, launches, regulatory changes.${exclusionNote}`
      );
    }

    // Cross-topic intersection queries
    const topics = contentUniverse.coreTopics;
    if (topics.length >= 2) {
      for (let i = 0; i < Math.min(topics.length - 1, 3); i++) {
        perplexitySet.add(
          `What is the latest news at the intersection of ${topics[i]} and ${topics[i + 1]}? Focus on developments from the last 48 hours that a ${role} would find actionable.${exclusionNote}`
        );
      }
    }

    // "Blind spot" query
    perplexitySet.add(
      `What are the most important things happening right now that someone focused on ${topicContext} at ${company} might be missing? Think adjacent markets, upstream/downstream changes, regulatory shifts, talent moves.${exclusionNote}`
    );
  } else {
    for (const topic of profile.topics) {
      perplexitySet.add(
        `What should a ${role} at ${company} know about ${topic} today? Focus on specific developments from the last 48 hours.`
      );
    }
  }

  for (const initiative of profile.initiatives) {
    perplexitySet.add(
      `What concrete developments happened in the last 48 hours related to ${initiative}? Include specific companies, product launches, funding rounds, or policy changes.${exclusionNote}`
    );
  }

  for (const concern of profile.concerns) {
    perplexitySet.add(
      `What should a ${role} know about ${concern} right now? Focus on new risks, competitive moves, or regulatory developments in the last 48 hours.${exclusionNote}`
    );
  }

  for (const gap of profile.knowledgeGaps) {
    perplexitySet.add(
      `What are the most important things happening in ${gap} that a ${role} working on ${topicContext} needs to understand right now?${exclusionNote}`
    );
  }

  // Tavily — targeted news discovery with context
  for (const co of profile.impressListCompanies) {
    tavilySet.add(`"${co}" ${topicContext} news announcements 2026`);
    tavilySet.add(`"${co}" partnerships launches strategy`);
  }

  for (const org of profile.peerOrgNames) {
    tavilySet.add(`"${org}" ${topicContext} news 2026`);
  }

  // Industry-wide queries
  if (topicContext) {
    tavilySet.add(`${topicContext} funding rounds acquisitions 2026`);
    tavilySet.add(`${topicContext} new regulations policy changes 2026`);
    tavilySet.add(`${topicContext} emerging startups launches 2026`);
  }

  return {
    perplexityQueries: [...perplexitySet],
    tavilyQueries: [...tavilySet],
  };
}

async function deriveLlmQueries(
  profile: ProfileContext,
  contentUniverse: ContentUniverse | null = null
): Promise<ResearchQueries> {
  let systemPrompt = `You generate research queries for an intelligence briefing system. This person needs to NOT sound stupid — they need to know things others in their space know, catch emerging trends early, and never be blindsided.

Generate two types of queries:
1. "perplexity" — deep research questions (for Perplexity Sonar). Natural-language questions that uncover specific, actionable intelligence. Ask about specific companies, deals, people, regulations, launches — not vague trend overviews.
2. "tavily" — targeted news search queries (for Tavily). Keyword-style queries to find specific recent articles. Include quoted company names, topic keywords, and year.

Think like their chief of staff preparing them for the day. What would embarrass them to not know? What's the thing everyone at their level is talking about? What just shifted that changes their calculus?

Generate 8-12 queries per type. Be SPECIFIC — "What did Anthropic announce about enterprise pricing this week" not "AI trends". Return ONLY a JSON object: {"perplexity": [...], "tavily": [...]}. No markdown.`;

  if (contentUniverse) {
    systemPrompt += `\n\nThe user's content universe:
- Definition: ${contentUniverse.definition}
- Core topics: ${contentUniverse.coreTopics.join(", ")}
- Exclusions: ${contentUniverse.exclusions.join(", ")}

Do NOT generate queries about these excluded topics: ${contentUniverse.exclusions.join(", ")}`;
  }

  const userContent: Record<string, unknown> = {
    role: profile.role,
    company: profile.company,
    topics: profile.topics,
    initiatives: profile.initiatives,
    concerns: profile.concerns,
    knowledgeGaps: profile.knowledgeGaps,
    impressListCompanies: profile.impressListCompanies,
    peerOrgNames: profile.peerOrgNames,
  };

  if (contentUniverse) {
    userContent.contentUniverse = {
      definition: contentUniverse.definition,
      coreTopics: contentUniverse.coreTopics,
      exclusions: contentUniverse.exclusions,
    };
  }

  const response = await chat(
    [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(userContent),
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.5, maxTokens: 1024 }
  );

  try {
    const cleaned = response.content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      perplexity?: string[];
      tavily?: string[];
    };
    return {
      perplexityQueries: Array.isArray(parsed.perplexity) ? parsed.perplexity : [],
      tavilyQueries: Array.isArray(parsed.tavily) ? parsed.tavily : [],
    };
  } catch (err) {
    log.error({ err, rawResponseSnippet: response.content.slice(0, 300) }, "Failed to parse LLM research queries — returning empty");
    return { perplexityQueries: [], tavilyQueries: [] };
  }
}

export interface MeetingContext {
  title: string;
  startTime: Date;
  attendees: {
    name: string | null;
    title: string | null;
    company: string | null;
    isOnImpressList: boolean;
  }[];
}

export function deriveMeetingPrepQueries(
  profile: ProfileContext,
  meetings: MeetingContext[],
  contentUniverse: ContentUniverse | null = null
): string[] {
  const queries: string[] = [];
  const role = profile.role || "professional";
  const company = profile.company || "their company";
  const topicSummary = contentUniverse
    ? contentUniverse.coreTopics.slice(0, 3).join(", ")
    : profile.topics.slice(0, 3).join(", ");

  for (const meeting of meetings) {
    const highPriority = meeting.attendees.filter((a) => {
      if (a.isOnImpressList) return true;
      const t = (a.title || "").toLowerCase();
      return /\b(c[eost]o|cfo|cio|cmo|cro|cto|chief|president|founder|partner|managing director|vp |vice president|svp|evp|head of|director|general manager|gm)\b/.test(t);
    });

    if (highPriority.length === 0) continue;

    for (const attendee of highPriority.slice(0, 2)) {
      const name = attendee.name || "someone";
      const attendeeTitle = attendee.title || "executive";
      const attendeeCompany = attendee.company || "their company";

      queries.push(
        `What should a ${role} at ${company} working on ${topicSummary} know before meeting ${name}, ${attendeeTitle} at ${attendeeCompany} today? Focus on recent developments at ${attendeeCompany}, industry news they would care about, and potential conversation topics. Only include concrete, specific facts from the last 48 hours.`
      );
    }
  }

  return queries;
}

export function deriveResearchQueries(
  profile: ProfileContext,
  contentUniverse: ContentUniverse | null = null
): ResearchQueries {
  return deriveTemplateQueries(profile, contentUniverse);
}

export async function deriveEnrichedResearchQueries(
  profile: ProfileContext,
  contentUniverse: ContentUniverse | null = null
): Promise<ResearchQueries> {
  const [template, llm] = await Promise.all([
    Promise.resolve(deriveTemplateQueries(profile, contentUniverse)),
    deriveLlmQueries(profile, contentUniverse).catch((err) => {
      log.error({ err }, "LLM query derivation failed — using template queries only");
      return {
        perplexityQueries: [] as string[],
        tavilyQueries: [] as string[],
      };
    }),
  ]);

  const perplexitySet = new Set([...template.perplexityQueries, ...llm.perplexityQueries]);
  const tavilySet = new Set([...template.tavilyQueries, ...llm.tavilyQueries]);

  return {
    perplexityQueries: [...perplexitySet],
    tavilyQueries: [...tavilySet],
  };
}
