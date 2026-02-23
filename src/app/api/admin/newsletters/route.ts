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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const newsletters = await db
    .select({
      newsletter: newsletterRegistry,
      subscriberCount: sql<number>`(
        SELECT COUNT(*)::int FROM user_newsletter_subscriptions
        WHERE newsletter_id = ${newsletterRegistry.id}
      )`,
    })
    .from(newsletterRegistry)
    .orderBy(newsletterRegistry.createdAt);

  return NextResponse.json({ newsletters });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    description,
    websiteUrl,
    industryTags,
    ingestionMethod,
    feedUrl,
    systemEmailSlug,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const values: Record<string, unknown> = {
    name,
    description: description || "",
    websiteUrl: websiteUrl || null,
    industryTags: industryTags || [],
    ingestionMethod: ingestionMethod || "pending",
    status: "pending_admin_setup",
  };

  if (ingestionMethod === "rss" && feedUrl) {
    const feed = await discoverNewsletterFeed(feedUrl);
    if (feed) {
      const [existingFeed] = await db
        .select()
        .from(syndicationFeeds)
        .where(eq(syndicationFeeds.feedUrl, feed.feedUrl))
        .limit(1);

      let feedId: string;
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

      values.feedUrl = feed.feedUrl;
      values.syndicationFeedId = feedId;
      values.status = "active";
    }
  }

  if (ingestionMethod === "system_email" && systemEmailSlug) {
    values.systemEmailAddress = `${systemEmailSlug}@newsletters.dontsoundstupid.com`;
    values.status = "active";
  }

  const [newsletter] = await db
    .insert(newsletterRegistry)
    .values(values as typeof newsletterRegistry.$inferInsert)
    .returning();

  return NextResponse.json({ newsletter }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const setValues: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.name !== undefined) setValues.name = updates.name;
  if (updates.description !== undefined)
    setValues.description = updates.description;
  if (updates.websiteUrl !== undefined)
    setValues.websiteUrl = updates.websiteUrl;
  if (updates.industryTags !== undefined)
    setValues.industryTags = updates.industryTags;
  if (updates.status !== undefined) setValues.status = updates.status;
  if (updates.ingestionMethod !== undefined)
    setValues.ingestionMethod = updates.ingestionMethod;
  if (updates.logoUrl !== undefined) setValues.logoUrl = updates.logoUrl;

  if (updates.systemEmailSlug) {
    setValues.systemEmailAddress = `${updates.systemEmailSlug}@newsletters.dontsoundstupid.com`;
    setValues.ingestionMethod = "system_email";
    setValues.status = "active";
  }

  if (updates.feedUrl) {
    const feed = await discoverNewsletterFeed(updates.feedUrl);
    if (feed) {
      const [existingFeed] = await db
        .select()
        .from(syndicationFeeds)
        .where(eq(syndicationFeeds.feedUrl, feed.feedUrl))
        .limit(1);

      let feedId: string;
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

      setValues.feedUrl = feed.feedUrl;
      setValues.syndicationFeedId = feedId;
      setValues.ingestionMethod = "rss";
      setValues.status = "active";
    }
  }

  const [updated] = await db
    .update(newsletterRegistry)
    .set(setValues as Partial<typeof newsletterRegistry.$inferInsert>)
    .where(eq(newsletterRegistry.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Newsletter not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ newsletter: updated });
}
