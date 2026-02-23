import Parser from "rss-parser";
import { db } from "../db";
import {
  syndicationFeeds,
  userFeedSubscriptions,
  userNewsletterSubscriptions,
  newsletterRegistry,
  peerOrganizations,
  impressContacts,
  users,
  signals,
  signalProvenance,
} from "../schema";
import { eq, and, lte, sql } from "drizzle-orm";
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
  newsletterProvenance?: { userId: string; newsletterName: string }[];
}

interface IngestionResult {
  signals: SyndicationSignal[];
  feedsPolled: number;
  newItems: number;
  errors: number;
}

export async function deriveFeedsForUser(userId: string): Promise<number> {
  const peerOrgs = await db
    .select({
      domain: peerOrganizations.domain,
      name: peerOrganizations.name,
      entityType: peerOrganizations.entityType,
    })
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

  const feedableTypes = new Set(["company", "publication", "community", "research-group", "analyst", "influencer"]);
  for (const org of peerOrgs) {
    if (org.domain && feedableTypes.has(org.entityType || "company")) {
      domains.add(org.domain);
      derivations.set(org.domain, {
        derivedFrom: "peer-org",
        profileReference: org.name,
      });
    }
  }

  const seenCompanies = new Set<string>();
  for (const contact of contacts) {
    if (!contact.company) continue;
    const companyLower = contact.company.toLowerCase();
    if (seenCompanies.has(companyLower)) continue;
    seenCompanies.add(companyLower);

    // Try well-known domain patterns before naive fallback
    const guesses = [
      `${companyLower.replace(/[^a-z0-9]/g, "")}.com`,
      `${companyLower.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.com`,
      `${companyLower.split(/\s+/)[0]}.com`,
    ];

    for (const domain of guesses) {
      if (!domains.has(domain)) {
        domains.add(domain);
        derivations.set(domain, {
          derivedFrom: "impress-list",
          profileReference: contact.company,
        });
        break;
      }
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

/**
 * For feeds linked to the newsletter registry, find all subscribed users
 * so provenance can be created with trigger_reason "newsletter-subscription".
 */
async function getNewsletterSubscribersForFeed(
  feedId: string
): Promise<{ userId: string; newsletterName: string }[]> {
  const rows = await db
    .select({
      userId: userNewsletterSubscriptions.userId,
      newsletterName: newsletterRegistry.name,
    })
    .from(newsletterRegistry)
    .innerJoin(
      userNewsletterSubscriptions,
      eq(userNewsletterSubscriptions.newsletterId, newsletterRegistry.id)
    )
    .where(eq(newsletterRegistry.syndicationFeedId, feedId));

  return rows;
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

      const newsletterSubs = await getNewsletterSubscribersForFeed(feed.id);

      const feedSubscribers = await db
        .select({
          userId: userFeedSubscriptions.userId,
          derivedFrom: userFeedSubscriptions.derivedFrom,
          profileReference: userFeedSubscriptions.profileReference,
        })
        .from(userFeedSubscriptions)
        .where(eq(userFeedSubscriptions.feedId, feed.id));

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

        const sourceUrl = item.link || "";
        const synSignal: SyndicationSignal = {
          layer: "syndication",
          title: item.title || "Untitled",
          content: item.content || item.contentSnippet || "",
          summary: item.contentSnippet || item.title || "",
          sourceUrl,
          publishedAt: pubDate?.toISOString() || null,
          metadata: {
            feedUrl: feed.feedUrl,
            siteName: feed.siteName || "",
            author: item.creator || item["dc:creator"] || undefined,
            categories: item.categories || undefined,
          },
          newsletterProvenance:
            newsletterSubs.length > 0 ? newsletterSubs : undefined,
        };
        result.signals.push(synSignal);
        result.newItems++;

        // Persist to signals table
        if (sourceUrl) {
          try {
            const [inserted] = await db
              .insert(signals)
              .values({
                layer: synSignal.newsletterProvenance ? "newsletter" : "syndication",
                sourceUrl,
                title: synSignal.title,
                content: synSignal.content,
                summary: synSignal.summary,
                metadata: {
                  feedUrl: feed.feedUrl,
                  siteName: feed.siteName || "",
                  ...(item.creator ? { author: item.creator } : {}),
                },
                publishedAt: pubDate || now,
              })
              .onConflictDoNothing()
              .returning({ id: signals.id });

            if (inserted) {
              for (const sub of feedSubscribers) {
                const reason = sub.derivedFrom === "impress-list" ? "impress-list" : "peer-org";
                await db
                  .insert(signalProvenance)
                  .values({
                    signalId: inserted.id,
                    userId: sub.userId,
                    triggerReason: reason,
                    profileReference: sub.profileReference,
                  })
                  .onConflictDoNothing();
              }
              for (const ns of newsletterSubs) {
                await db
                  .insert(signalProvenance)
                  .values({
                    signalId: inserted.id,
                    userId: ns.userId,
                    triggerReason: "newsletter-subscription",
                    profileReference: ns.newsletterName,
                  })
                  .onConflictDoNothing();
              }
            }
          } catch (err) {
            console.error("Failed to persist syndication signal:", err);
          }
        }
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
