import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { deriveNewsQueries, pollNewsQueries, refreshQueriesForUser } from "@/lib/news-ingestion";
import { deriveFeedsForUser, pollSyndicationFeeds } from "@/lib/syndication";
import { runAiResearch } from "@/lib/ai-research";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const allUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.onboardingStatus, "completed"));

  const results: {
    userId: string;
    newsSignals: number;
    syndicationSignals: number;
    aiSignals: number;
    errors: string[];
  }[] = [];

  for (const user of allUsers) {
    const entry = {
      userId: user.id,
      newsSignals: 0,
      syndicationSignals: 0,
      aiSignals: 0,
      errors: [] as string[],
    };

    try {
      await deriveNewsQueries(user.id);
      await refreshQueriesForUser(user.id);
    } catch (err) {
      entry.errors.push(`query-derivation: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      const newsResult = await pollNewsQueries(crypto.randomUUID());
      entry.newsSignals = newsResult.signals.length;
    } catch (err) {
      entry.errors.push(`news-poll: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      await deriveFeedsForUser(user.id);
    } catch (err) {
      entry.errors.push(`feed-derivation: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      const synResult = await pollSyndicationFeeds();
      entry.syndicationSignals = synResult.signals.length;
    } catch (err) {
      entry.errors.push(`syndication-poll: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      const aiSignals = await runAiResearch(user.id);
      entry.aiSignals = aiSignals.length;
    } catch (err) {
      entry.errors.push(`ai-research: ${err instanceof Error ? err.message : String(err)}`);
    }

    results.push(entry);
  }

  const summary = {
    usersProcessed: allUsers.length,
    totalNewsSignals: results.reduce((s, r) => s + r.newsSignals, 0),
    totalSyndicationSignals: results.reduce((s, r) => s + r.syndicationSignals, 0),
    totalAiSignals: results.reduce((s, r) => s + r.aiSignals, 0),
    usersWithErrors: results.filter((r) => r.errors.length > 0).length,
  };

  return NextResponse.json({ summary, results });
}
