import Parser from "rss-parser";
import { db } from "../db";
import {
  syndicationFeeds,
  userFeedSubscriptions,
  peerOrganizations,
  impressContacts,
  users,
} from "../schema";
import { eq, and, lte } from "drizzle-orm";
import { discoverFeeds } from "./feed-discovery";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "DontSoundStupid/1.0 (RSS Reader)" },
});

export interface SyndicationSignal {
  layer: "syndication";
  title: string;
  content: string;
  summary: string;
  sourceUrl: string;
  publishedAt: string | null;
  metadata: {
    feedUrl: string;
    siteName: string;
    author?: string;
    categories?: string[];
  };
}

interface IngestionResult {
  signals: SyndicationSignal[];
  feedsPolled: number;
  newItems: number;
  errors: number;
}

export async function deriveFeedsForUser(userId: string): Promise<number> {
  const peerOrgs = await db
    .select({ domain: peerOrganizations.domain, name: peerOrganizations.name })
    .from(peerOrganizations)
    .where(
      and(eq(peerOrganizations.userId, userId), eq(peerOrganizations.confirmed, true))
    );

  const contacts = await db
    .select({ company: impressContacts.company })
    .from(impressContacts)
    .where(
      and(eq(impressContacts.userId, userId), eq(impressContacts.active, true))
    );

  const domains = new Set<string>();
  const derivations = new Map<string, { derivedFrom: string; profileReference: string }>();

  for (const org of peerOrgs) {
    if (org.domain) {
      domains.add(org.domain);
      derivations.set(org.domain, {
        derivedFrom: "peer-org",
        profileReference: org.name,
      });
    }
  }

  const companyDomains = contacts
    .map((c) => c.company)
    .filter(Boolean)
    .map((company) => `${company!.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`);

  for (const domain of companyDomains) {
    if (!domains.has(domain)) {
      domains.add(domain);
      derivations.set(domain, {
        derivedFrom: "impress-list",
        profileReference: domain,
      });
    }
  }

  let feedsCreated = 0;

  for (const domain of domains) {
    try {
      const discovered = await discoverFeeds(domain);
      for (const feed of discovered) {
        const [existing] = await db
          .select({ id: syndicationFeeds.id })
          .from(syndicationFeeds)
          .where(eq(syndicationFeeds.feedUrl, feed.feedUrl))
          .limit(1);

        let feedId: string;
        if (existing) {
          feedId = existing.id;
        } else {
          const [created] = await db
            .insert(syndicationFeeds)
            .values({
              feedUrl: feed.feedUrl,
              siteUrl: feed.siteUrl,
              siteName: feed.siteName,
              feedType: feed.feedType,
            })
            .returning();
          feedId = created!.id;
          feedsCreated++;
        }

        const derivation = derivations.get(domain);
        if (derivation) {
          await db
            .insert(userFeedSubscriptions)
            .values({
              userId,
              feedId,
              derivedFrom: derivation.derivedFrom,
              profileReference: derivation.profileReference,
            })
            .onConflictDoNothing();
        }
      }
    } catch (err) {
      console.error(`Feed discovery failed for ${domain}:`, err);
    }
  }

  return feedsCreated;
}

export async function pollSyndicationFeeds(): Promise<IngestionResult> {
  const now = new Date();

  const activeFeeds = await db
    .select()
    .from(syndicationFeeds)
    .where(eq(syndicationFeeds.active, true));

  const result: IngestionResult = {
    signals: [],
    feedsPolled: 0,
    newItems: 0,
    errors: 0,
  };

  for (const feed of activeFeeds) {
    try {
      const parsed = await parser.parseURL(feed.feedUrl);
      result.feedsPolled++;

      const items = parsed.items || [];
      const lastItemDate = feed.lastItemDate
        ? new Date(feed.lastItemDate)
        : new Date(0);

      let newestDate = lastItemDate;

      for (const item of items) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : null;

        if (pubDate && pubDate <= lastItemDate) continue;
        if (!item.title && !item.contentSnippet) continue;

        if (pubDate && pubDate > newestDate) {
          newestDate = pubDate;
        }

        result.signals.push({
          layer: "syndication",
          title: item.title || "Untitled",
          content: item.content || item.contentSnippet || "",
          summary: item.contentSnippet || item.title || "",
          sourceUrl: item.link || "",
          publishedAt: pubDate?.toISOString() || null,
          metadata: {
            feedUrl: feed.feedUrl,
            siteName: feed.siteName || "",
            author: item.creator || item["dc:creator"] || undefined,
            categories: item.categories || undefined,
          },
        });
        result.newItems++;
      }

      await db
        .update(syndicationFeeds)
        .set({
          lastPolledAt: now,
          lastItemDate: newestDate > lastItemDate ? newestDate : undefined,
          consecutiveErrors: 0,
          lastErrorMessage: null,
        })
        .where(eq(syndicationFeeds.id, feed.id));
    } catch (err) {
      result.errors++;
      const message = err instanceof Error ? err.message : "Unknown error";

      await db
        .update(syndicationFeeds)
        .set({
          lastPolledAt: now,
          consecutiveErrors: (feed.consecutiveErrors || 0) + 1,
          lastErrorMessage: message,
          active: (feed.consecutiveErrors || 0) + 1 >= 10 ? false : undefined,
        })
        .where(eq(syndicationFeeds.id, feed.id));
    }
  }

  return result;
}
