/**
 * Data source health check — validates each ingestion layer independently.
 *
 * Usage:
 *   npm run test:sources
 *
 * Requires: DATABASE_URL in .env.local
 * Optional: PERPLEXITY_API_KEY, TAVILY_API_KEY, OPENAI_API_KEY
 *
 * No scoring agent, no composition — just checks that each source returns data.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

import { db } from "../db";
import { users, userProfiles, newsQueries, syndicationFeeds } from "../schema";
import { eq, isNotNull } from "drizzle-orm";
import { toStringArray } from "../safe-parse";
import { searchPerplexity } from "../ai-research/perplexity-client";
import { searchTavily } from "../ai-research/tavily-client";
import { deriveNewsQueries } from "../news-ingestion/query-derivation";
import { NewsApiAiClient } from "../news-ingestion/newsapi-client";
import { deriveFeedsForUser, pollSyndicationFeeds } from "../syndication/ingest";

let testUserId: string | null = null;
let userTopics: string[] = [];

beforeAll(async () => {
  const allProfiles = await db
    .select({ userId: userProfiles.userId, parsedTopics: userProfiles.parsedTopics })
    .from(userProfiles)
    .where(isNotNull(userProfiles.parsedTopics));

  const withContent = allProfiles.find((p) => toStringArray(p.parsedTopics).length > 0);
  if (withContent) {
    testUserId = withContent.userId;
    userTopics = toStringArray(withContent.parsedTopics);
  } else {
    const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
    testUserId = anyUser?.id ?? null;
  }
});

describe("Data source health checks", () => {
  it("has a test user", () => {
    expect(testUserId).not.toBeNull();
    console.log(`User: ${testUserId}`);
    console.log(`Topics: ${userTopics.join(", ")}`);
  });

  describe("Perplexity (sonar)", () => {
    it("returns content for a topic query", async () => {
      if (!process.env.PERPLEXITY_API_KEY) {
        console.log("SKIPPED — PERPLEXITY_API_KEY not set");
        return;
      }
      const query = `Latest developments in ${userTopics[0] || "technology"} in the last 48 hours`;
      const result = await searchPerplexity(query);
      console.log("Perplexity:", {
        hasContent: !!result?.content,
        contentLength: result?.content?.length ?? 0,
        citations: result?.citations?.length ?? 0,
      });
      expect(result).not.toBeNull();
      expect(result!.content.length).toBeGreaterThan(0);
    }, 30_000);
  });

  describe("Tavily (web search)", () => {
    it("returns results for a topic query", async () => {
      if (!process.env.TAVILY_API_KEY) {
        console.log("SKIPPED — TAVILY_API_KEY not set");
        return;
      }
      const query = `${userTopics[0] || "technology"} news 2026`;
      const result = await searchTavily(query, { maxResults: 3 });
      console.log("Tavily:", {
        resultCount: result?.results?.length ?? 0,
        titles: result?.results?.map((r) => r.title.slice(0, 60)) ?? [],
      });
      expect(result).not.toBeNull();
      expect(result!.results.length).toBeGreaterThan(0);
    }, 30_000);
  });

  describe("NewsAPI.ai (news)", () => {
    it("derives news queries from user profile", async () => {
      if (!testUserId) return;
      await deriveNewsQueries(testUserId);
      const queries = await db
        .select({ id: newsQueries.id, queryText: newsQueries.queryText, derivedFrom: newsQueries.derivedFrom })
        .from(newsQueries)
        .where(eq(newsQueries.userId, testUserId));
      console.log("News queries:", {
        count: queries.length,
        sources: [...new Set(queries.map((q) => q.derivedFrom))],
        samples: queries.slice(0, 3).map((q) => q.queryText.slice(0, 60)),
      });
      expect(queries.length).toBeGreaterThan(0);
    }, 30_000);

    it("fetches articles from NewsAPI.ai", async () => {
      if (!process.env.NEWSAPI_AI_KEY) {
        console.log("SKIPPED — NEWSAPI_AI_KEY not set");
        return;
      }
      const client = new NewsApiAiClient({ maxResults: 5, lookbackHours: 48 });
      const query = userTopics[0] || "insurance";
      const result = await client.searchArticles(query);
      console.log("NewsAPI.ai:", {
        query,
        articlesFound: result.totalResults,
        samples: result.articles.slice(0, 3).map((a) => ({
          title: a.title.slice(0, 60),
          hasBody: a.body.length > 0,
          sentiment: a.sentiment,
          source: a.source.title,
        })),
      });
      expect(result.articles.length).toBeGreaterThan(0);
      expect(result.articles[0]!.body.length).toBeGreaterThan(0);
    }, 30_000);
  });

  describe("Syndication (RSS)", () => {
    it("derives feeds from user context", async () => {
      if (!testUserId) return;
      const count = await deriveFeedsForUser(testUserId);
      const feeds = await db
        .select({ id: syndicationFeeds.id, feedUrl: syndicationFeeds.feedUrl, siteName: syndicationFeeds.siteName })
        .from(syndicationFeeds)
        .where(eq(syndicationFeeds.active, true));
      console.log("RSS feeds:", {
        derived: count,
        totalActive: feeds.length,
        samples: feeds.slice(0, 3).map((f) => f.siteName || f.feedUrl.slice(0, 60)),
      });
    }, 30_000);

    it("polls RSS feeds for items", async () => {
      const result = await pollSyndicationFeeds();
      console.log("RSS poll:", {
        feedsPolled: result.feedsPolled,
        newItems: result.newItems,
        signalCount: result.signals.length,
        errors: result.errors,
      });
      if (result.signals.length > 0) {
        console.log("  Sample:", result.signals[0]!.title.slice(0, 80));
      }
      console.log(result.signals.length > 0 ? "RSS: LIVE DATA" : "RSS: No new items (feeds may be empty or already polled)");
    }, 60_000);
  });
});
