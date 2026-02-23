import { db } from "../db";
import {
  users,
  userProfiles,
  syndicationFeeds,
  userFeedSubscriptions,
} from "../schema";
import { eq } from "drizzle-orm";
import { chat } from "../llm";
import { toStringArray } from "../safe-parse";
import { discoverFeeds, discoverNewsletterFeed } from "./feed-discovery";
import { searchTavily } from "../ai-research/tavily-client";
import type { ContentUniverse } from "../../models/content-universe";

interface SuggestedSource {
  name: string;
  url: string;
  reason: string;
}

interface SmartDiscoveryResult {
  feedsDiscovered: number;
  sourcesAttempted: number;
  errors: number;
}

async function suggestSources(
  role: string,
  company: string,
  topics: string[],
  initiatives: string[],
  existingFeedDomains: string[],
  contentUniverse: ContentUniverse | null = null
): Promise<SuggestedSource[]> {
  let systemPrompt = `You are an information source curator. Given a professional's role and interests, suggest 15-20 high-quality information sources they should follow. Include:
- Trade publications and industry news sites
- Expert blogs and analysis sites
- Newsletters (Substack, Buttondown, etc.)
- Research organization blogs
- Community forums or aggregators
- Podcast/video channels with RSS feeds

Prioritize sources that:
- Publish frequently (at least weekly)
- Cover the professional's specific domain, not just general business news
- Offer unique perspectives or original reporting
- Are widely respected in the industry

Do NOT suggest these domains (already subscribed): ${existingFeedDomains.join(", ")}

Return ONLY a JSON array, no markdown. Each element:
{"name": "Source Name", "url": "https://example.com", "reason": "Why this matters"}`;

  if (contentUniverse) {
    systemPrompt += `\n\nThe user's content universe: ${contentUniverse.definition}. Only suggest sources that specifically cover their niche. Do NOT suggest general industry sources that primarily cover these excluded topics: ${contentUniverse.exclusions.join(", ")}`;
  }

  const response = await chat(
    [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Role: ${role}\nCompany: ${company}\nTopics: ${topics.join(", ")}\nInitiatives: ${initiatives.join(", ")}`,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.4, maxTokens: 2048 }
  );

  try {
    const cleaned = response.content
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as SuggestedSource[];
    return parsed.filter((s) => s.name && s.url);
  } catch {
    console.error("Failed to parse smart discovery LLM response:", response.content);
    return [];
  }
}

async function findFeedUrl(source: SuggestedSource): Promise<string | null> {
  let domain: string;
  try {
    domain = new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  // Try direct feed discovery from the URL
  const directFeeds = await discoverFeeds(source.url);
  if (directFeeds.length > 0) return directFeeds[0]!.feedUrl;

  // Try newsletter-specific discovery
  const newsletterFeed = await discoverNewsletterFeed(source.url);
  if (newsletterFeed) return newsletterFeed.feedUrl;

  // Try domain-level feed discovery
  const domainFeeds = await discoverFeeds(domain);
  if (domainFeeds.length > 0) return domainFeeds[0]!.feedUrl;

  // Last resort: ask Tavily to find the RSS feed
  if (process.env.TAVILY_API_KEY) {
    try {
      const result = await searchTavily(`"${source.name}" RSS feed URL OR atom feed`, {
        topic: "general",
        maxResults: 3,
      });
      if (result?.results) {
        for (const r of result.results) {
          if (r.url.includes("/feed") || r.url.includes("/rss") || r.url.includes("atom")) {
            const check = await discoverFeeds(r.url);
            if (check.length > 0) return check[0]!.feedUrl;
          }
        }
      }
    } catch {
      // Tavily search failed
    }
  }

  return null;
}

export async function smartDiscoverFeeds(userId: string): Promise<SmartDiscoveryResult> {
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
    return { feedsDiscovered: 0, sourcesAttempted: 0, errors: 0 };
  }

  const existingSubs = await db
    .select({ feedId: userFeedSubscriptions.feedId })
    .from(userFeedSubscriptions)
    .where(eq(userFeedSubscriptions.userId, userId));

  const existingFeedIds = existingSubs.map((s) => s.feedId);
  let existingFeedDomains: string[] = [];

  if (existingFeedIds.length > 0) {
    const feeds = await db
      .select({ siteUrl: syndicationFeeds.siteUrl })
      .from(syndicationFeeds);
    existingFeedDomains = feeds
      .map((f) => {
        try {
          return f.siteUrl ? new URL(f.siteUrl).hostname.replace(/^www\./, "") : null;
        } catch {
          return null;
        }
      })
      .filter((d): d is string => !!d);
  }

  const contentUniverse = (profile as Record<string, unknown>).contentUniverse as ContentUniverse | null;

  const sources = await suggestSources(
    user.title || "professional",
    user.company || "a company",
    toStringArray(profile.parsedTopics),
    toStringArray(profile.parsedInitiatives),
    existingFeedDomains,
    contentUniverse
  );

  let feedsDiscovered = 0;
  let errors = 0;

  for (const source of sources) {
    try {
      const feedUrl = await findFeedUrl(source);
      if (!feedUrl) continue;

      const [existing] = await db
        .select({ id: syndicationFeeds.id })
        .from(syndicationFeeds)
        .where(eq(syndicationFeeds.feedUrl, feedUrl))
        .limit(1);

      let feedId: string;
      if (existing) {
        feedId = existing.id;
      } else {
        const siteName = source.name;
        let siteUrl = source.url;
        try {
          siteUrl = new URL(source.url).origin;
        } catch { /* keep original */ }

        const [created] = await db
          .insert(syndicationFeeds)
          .values({
            feedUrl,
            siteUrl,
            siteName,
            feedType: feedUrl.includes("atom") ? "atom" : "rss",
          })
          .returning();
        feedId = created!.id;
        feedsDiscovered++;
      }

      await db
        .insert(userFeedSubscriptions)
        .values({
          userId,
          feedId,
          derivedFrom: "ai-discovery",
          profileReference: source.name,
        })
        .onConflictDoNothing();
    } catch (err) {
      console.error(`Smart discovery failed for ${source.name}:`, err);
      errors++;
    }
  }

  // Update last discovery timestamp
  await db
    .update(userProfiles)
    .set({ lastDiscoveryAt: new Date() })
    .where(eq(userProfiles.userId, userId));

  return { feedsDiscovered, sourcesAttempted: sources.length, errors };
}
