import { chat } from "../llm";

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

function deriveTemplateQueries(profile: ProfileContext): ResearchQueries {
  const perplexitySet = new Set<string>();
  const tavilySet = new Set<string>();

  const role = profile.role || "professional";
  const company = profile.company || "their company";

  for (const topic of profile.topics) {
    perplexitySet.add(
      `What should a ${role} at ${company} know about ${topic} today?`
    );
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

async function deriveLlmQueries(profile: ProfileContext): Promise<ResearchQueries> {
  const response = await chat(
    [
      {
        role: "system",
        content: `You generate research queries for an intelligence briefing system. Given a professional's context, generate two types of queries:
1. "perplexity" — synthesized research questions (for Perplexity Sonar). These should be natural-language questions that surface strategic insights, emerging trends, and contextual intelligence.
2. "tavily" — targeted news discovery queries (for Tavily search). These should be keyword-style queries that find specific articles and announcements.

Focus on:
- The professional's white space — things happening in their field they might miss
- Emerging terminology and new concepts relevant to their role
- Cross-cutting trends that connect their topics, initiatives, and concerns
- Adjacent developments that could impact their work

Return ONLY a JSON object with two arrays: {"perplexity": [...], "tavily": [...]}. No markdown. 5-8 queries per type.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          role: profile.role,
          company: profile.company,
          topics: profile.topics,
          initiatives: profile.initiatives,
          concerns: profile.concerns,
          knowledgeGaps: profile.knowledgeGaps,
          impressListCompanies: profile.impressListCompanies,
          peerOrgNames: profile.peerOrgNames,
        }),
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
  } catch {
    console.error("Failed to parse LLM research queries:", response.content);
    return { perplexityQueries: [], tavilyQueries: [] };
  }
}

export function deriveResearchQueries(profile: ProfileContext): ResearchQueries {
  return deriveTemplateQueries(profile);
}

export async function deriveEnrichedResearchQueries(
  profile: ProfileContext
): Promise<ResearchQueries> {
  const [template, llm] = await Promise.all([
    Promise.resolve(deriveTemplateQueries(profile)),
    deriveLlmQueries(profile).catch(() => ({
      perplexityQueries: [] as string[],
      tavilyQueries: [] as string[],
    })),
  ]);

  const perplexitySet = new Set([...template.perplexityQueries, ...llm.perplexityQueries]);
  const tavilySet = new Set([...template.tavilyQueries, ...llm.tavilyQueries]);

  return {
    perplexityQueries: [...perplexitySet],
    tavilyQueries: [...tavilySet],
  };
}
