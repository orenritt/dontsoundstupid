import { db } from "../db";
import {
  users,
  userProfiles,
  newsQueries,
  feedbackSignals,
  briefings,
} from "../schema";
import { eq, desc } from "drizzle-orm";
import { chat } from "../llm";
import { toStringArray } from "../safe-parse";
import { contentHash } from "./query-derivation";
import type { NewsQueryDerivedFrom } from "../../models/news-ingestion";
import type { ContentUniverse } from "../../models/content-universe";

interface DerivedQuery {
  queryText: string;
  derivedFrom: NewsQueryDerivedFrom;
  profileReference: string;
  geographicFilters: string[];
}

export async function refreshQueriesForUser(userId: string): Promise<number> {
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

  if (!user || !profile) return 0;

  const existingQueries = await db
    .select({ queryText: newsQueries.queryText, derivedFrom: newsQueries.derivedFrom })
    .from(newsQueries)
    .where(eq(newsQueries.userId, userId));

  const recentFeedback = await db
    .select({ type: feedbackSignals.type, topic: feedbackSignals.topic })
    .from(feedbackSignals)
    .where(eq(feedbackSignals.userId, userId))
    .orderBy(desc(feedbackSignals.createdAt))
    .limit(20);

  const recentBriefingRows = await db
    .select({ items: briefings.items })
    .from(briefings)
    .where(eq(briefings.userId, userId))
    .orderBy(desc(briefings.generatedAt))
    .limit(3);

  const recentTopics = recentBriefingRows
    .flatMap((b) => (b.items as { topic: string }[])?.map((i) => i.topic) ?? [])
    .slice(0, 15);

  const moreTopics = recentFeedback
    .filter((f) => f.type === "tune-more" && f.topic)
    .map((f) => f.topic!);
  const lessTopics = recentFeedback
    .filter((f) => f.type === "tune-less" && f.topic)
    .map((f) => f.topic!);

  const contentUniverse = (profile as Record<string, unknown>).contentUniverse as ContentUniverse | null;

  const promptContext: Record<string, unknown> = {
    role: user.title || "professional",
    company: user.company || "unknown company",
    topics: toStringArray(profile.parsedTopics),
    initiatives: toStringArray(profile.parsedInitiatives),
    concerns: toStringArray(profile.parsedConcerns),
    knowledgeGaps: toStringArray(profile.parsedKnowledgeGaps),
    expertAreas: toStringArray(profile.parsedExpertAreas),
    existingQueries: existingQueries.map((q) => q.queryText),
    recentBriefingTopics: recentTopics,
    userWantsMore: moreTopics,
    userWantsLess: lessTopics,
  };

  if (contentUniverse) {
    promptContext.contentUniverse = {
      definition: contentUniverse.definition,
      coreTopics: contentUniverse.coreTopics,
      exclusions: contentUniverse.exclusions,
    };
  }

  let systemPrompt = `You are an intelligence query strategist. Generate search queries that will surface news and developments relevant to a specific professional. Account for:
- Deeper, more specific angles WITHIN the user's content universe — specific sub-niches, specific mechanisms, specific regulatory bodies, specific companies within their domain
- Do NOT broaden beyond their content universe into parent categories or adjacent fields
- Topics they've indicated they want more of
- Avoid topics they've indicated they want less of
- Don't duplicate existing queries

Return ONLY a JSON array of strings — each string is a search query. No markdown, no explanation. Generate 5-10 queries.`;

  if (contentUniverse) {
    systemPrompt += `\n\nThe user's content universe is provided. Generate queries that go DEEPER within this universe, not broader. Do NOT generate queries about these excluded topics: ${contentUniverse.exclusions.join(", ")}`;
  }

  const response = await chat(
    [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(promptContext),
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.5, maxTokens: 1024 }
  );

  let newQueryTexts: string[] = [];
  try {
    const cleaned = response.content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    newQueryTexts = JSON.parse(cleaned);
    if (!Array.isArray(newQueryTexts)) return 0;
  } catch {
    console.error("Failed to parse query refresh LLM response:", response.content);
    return 0;
  }

  const existingHashes = new Set(existingQueries.map((q) => contentHash(q.queryText)));
  let inserted = 0;

  for (const queryText of newQueryTexts) {
    if (!queryText || typeof queryText !== "string") continue;
    const hash = contentHash(queryText);
    if (existingHashes.has(hash)) continue;

    try {
      await db.insert(newsQueries).values({
        userId,
        queryText,
        derivedFrom: "ai-refresh",
        profileReference: "query-refresh",
        contentHash: hash,
        geographicFilters: [],
        active: true,
      });
      existingHashes.add(hash);
      inserted++;
    } catch {
      // duplicate or other constraint violation
    }
  }

  return inserted;
}
