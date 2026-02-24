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

  if (contentUniverse) {
    const exclusionsSuffix = contentUniverse.exclusions.length > 0
      ? ` Do NOT include ${contentUniverse.exclusions.join(", ")}.`
      : "";

    for (const entry of contentUniverse.coreTopics) {
      perplexitySet.add(
        `What recent developments in ${entry} should a ${role} at ${company} know about?${exclusionsSuffix}`
      );
    }
  } else {
    for (const topic of profile.topics) {
      perplexitySet.add(
        `What should a ${role} at ${company} know about ${topic} today?`
      );
    }
  }

  for (const initiative of profile.initiatives) {
    perplexitySet.add(`Latest developments in ${initiative}`);
  }

  for (const concern of profile.concerns) {
    perplexitySet.add(`Recent news and developments about ${concern}`);
  }

  for (const gap of profile.knowledgeGaps) {
    perplexitySet.add(`Key things to understand about ${gap} right now`);
  }

  for (const co of profile.impressListCompanies) {
    tavilySet.add(`${co} news announcements`);
  }

  for (const org of profile.peerOrgNames) {
    tavilySet.add(`${org} recent news`);
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
  let systemPrompt = `You generate research queries for an intelligence briefing system. Given a professional's context, generate two types of queries:
1. "perplexity" — synthesized research questions (for Perplexity Sonar). These should be natural-language questions that surface strategic insights, emerging trends, and contextual intelligence.
2. "tavily" — targeted news discovery queries (for Tavily search). These should be keyword-style queries that find specific articles and announcements.

Focus on:
- Deeper, more specific angles within the professional's niche — specific sub-topics, specific regulatory developments, specific companies or players
- Emerging terminology and new concepts relevant to their role
- Developments specifically within their content universe that they need to track

Return ONLY a JSON object with two arrays: {"perplexity": [...], "tavily": [...]}. No markdown. 5-8 queries per type.`;

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
