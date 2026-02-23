import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { smartDiscoverFeeds } from "@/lib/syndication";

const CRON_SECRET = process.env.CRON_SECRET;
const DISCOVERY_INTERVAL_DAYS = 7;

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const cutoff = new Date(Date.now() - DISCOVERY_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

  const eligibleProfiles = await db
    .select({
      userId: userProfiles.userId,
      lastDiscoveryAt: userProfiles.lastDiscoveryAt,
    })
    .from(userProfiles)
    .innerJoin(users, eq(users.id, userProfiles.userId))
    .where(eq(users.onboardingStatus, "completed"));

  const dueUsers = eligibleProfiles.filter(
    (p) => !p.lastDiscoveryAt || p.lastDiscoveryAt <= cutoff
  );

  const results: {
    userId: string;
    feedsDiscovered: number;
    sourcesAttempted: number;
    errors: number;
  }[] = [];

  for (const profile of dueUsers) {
    try {
      const result = await smartDiscoverFeeds(profile.userId);
      results.push({ userId: profile.userId, ...result });
    } catch (err) {
      console.error(`Smart discovery failed for user ${profile.userId}:`, err);
      results.push({
        userId: profile.userId,
        feedsDiscovered: 0,
        sourcesAttempted: 0,
        errors: 1,
      });
    }
  }

  return NextResponse.json({
    summary: {
      usersProcessed: dueUsers.length,
      totalFeedsDiscovered: results.reduce((s, r) => s + r.feedsDiscovered, 0),
      totalSourcesAttempted: results.reduce((s, r) => s + r.sourcesAttempted, 0),
    },
    results,
  });
}
