import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, briefings } from "@/lib/schema";
import { eq, and, gte } from "drizzle-orm";
import { runPipeline } from "@/lib/pipeline";
import { refreshQueriesForUser } from "@/lib/news-ingestion";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const allUsers = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.onboardingStatus, "completed"));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const results: { userId: string; status: string; briefingId?: string; error?: string }[] = [];

  for (const user of allUsers) {
    const existing = await db
      .select({ id: briefings.id })
      .from(briefings)
      .where(
        and(
          eq(briefings.userId, user.id),
          gte(briefings.generatedAt, todayStart)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      results.push({ userId: user.id, status: "skipped", briefingId: existing[0]!.id });
      continue;
    }

    try {
      try {
        await refreshQueriesForUser(user.id);
      } catch (err) {
        console.error(`Query refresh failed for user ${user.id} (non-critical):`, err);
      }

      const briefingId = await runPipeline(user.id);
      results.push({
        userId: user.id,
        status: briefingId ? "success" : "no_content",
        briefingId: briefingId ?? undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Pipeline failed for user ${user.id}:`, message);
      results.push({ userId: user.id, status: "error", error: message });
    }
  }

  const summary = {
    total: allUsers.length,
    success: results.filter((r) => r.status === "success").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    noContent: results.filter((r) => r.status === "no_content").length,
  };

  return NextResponse.json({ summary, results });
}
