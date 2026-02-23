import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  newsletterRegistry,
  userNewsletterSubscriptions,
  syndicationFeeds,
} from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { discoverNewsletterFeed } from "@/lib/syndication/feed-discovery";

const URL_REGEX = /^https?:\/\/.+/i;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { input } = await request.json();
  if (!input || typeof input !== "string" || !input.trim()) {
    return NextResponse.json({ error: "Input is required" }, { status: 400 });
  }

  const trimmed = input.trim();
  const isUrl = URL_REGEX.test(trimmed);

  // Check for existing registry match by name (case-insensitive) or URL
  const existing = await findExistingNewsletter(trimmed, isUrl);
  if (existing) {
    await subscribeUser(session.user.id, existing.id);
    return NextResponse.json({
      status: "subscribed",
      newsletter: existing,
      message: "Added to your content universe.",
    });
  }

  if (isUrl) {
    return await handleUrlSubmission(trimmed, session.user.id);
  } else {
    return await handleNameSubmission(trimmed, session.user.id);
  }
}

async function findExistingNewsletter(input: string, isUrl: boolean) {
  if (isUrl) {
    const [byFeedUrl] = await db
      .select()
      .from(newsletterRegistry)
      .where(eq(newsletterRegistry.feedUrl, input))
      .limit(1);
    if (byFeedUrl) return byFeedUrl;

    const [byWebsite] = await db
      .select()
      .from(newsletterRegistry)
      .where(eq(newsletterRegistry.websiteUrl, input))
      .limit(1);
    if (byWebsite) return byWebsite;
  } else {
    const [byName] = await db
      .select()
      .from(newsletterRegistry)
      .where(sql`LOWER(${newsletterRegistry.name}) = LOWER(${input})`)
      .limit(1);
    if (byName) return byName;
  }
  return null;
}

async function handleUrlSubmission(url: string, userId: string) {
  try {
    const feed = await discoverNewsletterFeed(url);
    if (feed) {
      // Create syndication feed entry
      let feedId: string;
      const [existingFeed] = await db
        .select()
        .from(syndicationFeeds)
        .where(eq(syndicationFeeds.feedUrl, feed.feedUrl))
        .limit(1);

      if (existingFeed) {
        feedId = existingFeed.id;
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
      }

      // Create registry entry
      const [newsletter] = await db
        .insert(newsletterRegistry)
        .values({
          name: feed.siteName,
          description: "",
          websiteUrl: feed.siteUrl,
          ingestionMethod: "rss",
          feedUrl: feed.feedUrl,
          syndicationFeedId: feedId,
          status: "active",
        })
        .returning();

      await subscribeUser(userId, newsletter!.id);

      return NextResponse.json({
        status: "subscribed",
        newsletter: newsletter,
        message: "Found it! Added to your content universe.",
      });
    }
  } catch {
    // Feed discovery failed, fall through to pending
  }

  // No feed found — create pending entry
  const hostname = safeHostname(url);
  const [newsletter] = await db
    .insert(newsletterRegistry)
    .values({
      name: hostname || url,
      description: "",
      websiteUrl: url,
      ingestionMethod: "pending",
      status: "pending_admin_setup",
    })
    .returning();

  await subscribeUser(userId, newsletter!.id);

  return NextResponse.json({
    status: "pending",
    newsletter: newsletter,
    message:
      "We'll get this set up for you. You'll start seeing content once it's activated.",
  });
}

async function handleNameSubmission(name: string, userId: string) {
  const [newsletter] = await db
    .insert(newsletterRegistry)
    .values({
      name,
      description: "",
      ingestionMethod: "pending",
      status: "pending_admin_setup",
    })
    .returning();

  await subscribeUser(userId, newsletter!.id);

  return NextResponse.json({
    status: "pending",
    newsletter: newsletter,
    message:
      "We'll get this set up for you. You'll start seeing content once it's activated.",
  });
}

async function subscribeUser(userId: string, newsletterId: string) {
  await db
    .insert(userNewsletterSubscriptions)
    .values({ userId, newsletterId })
    .onConflictDoNothing();
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
