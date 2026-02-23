import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { scanKnowledgeGaps } from "@/lib/knowledge-gap-scan";

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
    gapsFound: number;
    queriesAdded: number;
    entitiesSeeded: number;
    error?: string;
  }[] = [];

  for (const user of allUsers) {
    try {
      const result = await scanKnowledgeGaps(user.id);
      results.push({ userId: user.id, ...result });
    } catch (err) {
      console.error(`Knowledge gap scan failed for user ${user.id}:`, err);
      results.push({
        userId: user.id,
        gapsFound: 0,
        queriesAdded: 0,
        entitiesSeeded: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    summary: {
      usersProcessed: allUsers.length,
      totalGapsFound: results.reduce((s, r) => s + r.gapsFound, 0),
      totalQueriesAdded: results.reduce((s, r) => s + r.queriesAdded, 0),
      totalEntitiesSeeded: results.reduce((s, r) => s + r.entitiesSeeded, 0),
      errors: results.filter((r) => r.error).length,
    },
    results,
  });
}
