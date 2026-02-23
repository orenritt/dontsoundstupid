import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { scanKnowledgeGaps } from "@/lib/knowledge-gap-scan";
import { smartDiscoverFeeds } from "@/lib/syndication";
import {
  deriveNewsQueries,
  pollNewsQueries,
  refreshQueriesForUser,
} from "@/lib/news-ingestion";
import { deriveFeedsForUser, pollSyndicationFeeds } from "@/lib/syndication";
import { runAiResearch } from "@/lib/ai-research";
import { runPipeline } from "@/lib/pipeline";

const ADMIN_EMAIL = "orenrittenberg@gmail.com";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const rows = await db.execute(
    sql`SELECT email FROM users WHERE id = ${session.user.id} LIMIT 1`
  );
  const userRows = rows as unknown as { email: string }[];
  if (!userRows[0] || userRows[0].email !== ADMIN_EMAIL) return null;
  return session.user.id;
}

async function getCompletedUsers() {
  return db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.onboardingStatus, "completed"));
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const job = body.job as string;

  const startTime = Date.now();

  switch (job) {
    case "knowledge-gaps": {
      const allUsers = await getCompletedUsers();
      const results: {
        userId: string;
        email: string | null;
        gapsFound: number;
        queriesAdded: number;
        entitiesSeeded: number;
        error?: string;
      }[] = [];

      for (const user of allUsers) {
        try {
          const result = await scanKnowledgeGaps(user.id);
          results.push({ userId: user.id, email: user.email, ...result });
        } catch (err) {
          results.push({
            userId: user.id,
            email: user.email,
            gapsFound: 0,
            queriesAdded: 0,
            entitiesSeeded: 0,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return NextResponse.json({
        job,
        durationMs: Date.now() - startTime,
        summary: {
          usersProcessed: allUsers.length,
          totalGapsFound: results.reduce((s, r) => s + r.gapsFound, 0),
          totalQueriesAdded: results.reduce((s, r) => s + r.queriesAdded, 0),
          totalEntitiesSeeded: results.reduce(
            (s, r) => s + r.entitiesSeeded,
            0
          ),
          errors: results.filter((r) => r.error).length,
        },
        results,
      });
    }

    case "discover-feeds": {
      const allUsers = await getCompletedUsers();
      const results: {
        userId: string;
        email: string | null;
        feedsDiscovered: number;
        sourcesAttempted: number;
        errors: number;
      }[] = [];

      for (const user of allUsers) {
        try {
          const result = await smartDiscoverFeeds(user.id);
          results.push({ userId: user.id, email: user.email, ...result });
        } catch (err) {
          console.error(`Smart discovery failed for user ${user.id}:`, err);
          results.push({
            userId: user.id,
            email: user.email,
            feedsDiscovered: 0,
            sourcesAttempted: 0,
            errors: 1,
          });
        }
      }

      return NextResponse.json({
        job,
        durationMs: Date.now() - startTime,
        summary: {
          usersProcessed: allUsers.length,
          totalFeedsDiscovered: results.reduce(
            (s, r) => s + r.feedsDiscovered,
            0
          ),
          totalSourcesAttempted: results.reduce(
            (s, r) => s + r.sourcesAttempted,
            0
          ),
        },
        results,
      });
    }

    case "ingest": {
      const allUsers = await getCompletedUsers();
      const results: {
        userId: string;
        email: string | null;
        newsSignals: number;
        syndicationSignals: number;
        aiSignals: number;
        errors: string[];
      }[] = [];

      for (const user of allUsers) {
        const entry = {
          userId: user.id,
          email: user.email,
          newsSignals: 0,
          syndicationSignals: 0,
          aiSignals: 0,
          errors: [] as string[],
        };

        try {
          await deriveNewsQueries(user.id);
          await refreshQueriesForUser(user.id);
        } catch (err) {
          entry.errors.push(
            `query-derivation: ${err instanceof Error ? err.message : String(err)}`
          );
        }

        try {
          const newsResult = await pollNewsQueries(crypto.randomUUID());
          entry.newsSignals = newsResult.signals.length;
        } catch (err) {
          entry.errors.push(
            `news-poll: ${err instanceof Error ? err.message : String(err)}`
          );
        }

        try {
          await deriveFeedsForUser(user.id);
        } catch (err) {
          entry.errors.push(
            `feed-derivation: ${err instanceof Error ? err.message : String(err)}`
          );
        }

        try {
          const synResult = await pollSyndicationFeeds();
          entry.syndicationSignals = synResult.signals.length;
        } catch (err) {
          entry.errors.push(
            `syndication-poll: ${err instanceof Error ? err.message : String(err)}`
          );
        }

        try {
          const aiSignals = await runAiResearch(user.id);
          entry.aiSignals = aiSignals.length;
        } catch (err) {
          entry.errors.push(
            `ai-research: ${err instanceof Error ? err.message : String(err)}`
          );
        }

        results.push(entry);
      }

      return NextResponse.json({
        job,
        durationMs: Date.now() - startTime,
        summary: {
          usersProcessed: allUsers.length,
          totalNewsSignals: results.reduce((s, r) => s + r.newsSignals, 0),
          totalSyndicationSignals: results.reduce(
            (s, r) => s + r.syndicationSignals,
            0
          ),
          totalAiSignals: results.reduce((s, r) => s + r.aiSignals, 0),
          usersWithErrors: results.filter((r) => r.errors.length > 0).length,
        },
        results,
      });
    }

    case "daily": {
      const allUsers = await getCompletedUsers();
      const results: {
        userId: string;
        email: string | null;
        status: string;
        briefingId?: string;
        error?: string;
      }[] = [];

      for (const user of allUsers) {
        try {
          try {
            await refreshQueriesForUser(user.id);
          } catch {
            // non-critical
          }
          const briefingId = await runPipeline(user.id);
          if (briefingId === "skipped") {
            results.push({ userId: user.id, email: user.email, status: "skipped_not_interesting" });
          } else {
            results.push({
              userId: user.id,
              email: user.email,
              status: briefingId ? "success" : "no_content",
              briefingId: briefingId ?? undefined,
            });
          }
        } catch (err) {
          results.push({
            userId: user.id,
            email: user.email,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return NextResponse.json({
        job,
        durationMs: Date.now() - startTime,
        summary: {
          total: allUsers.length,
          success: results.filter((r) => r.status === "success").length,
          noContent: results.filter((r) => r.status === "no_content").length,
          errors: results.filter((r) => r.status === "error").length,
        },
        results,
      });
    }

    default:
      return NextResponse.json(
        { error: `Unknown job: ${job}` },
        { status: 400 }
      );
  }
}
