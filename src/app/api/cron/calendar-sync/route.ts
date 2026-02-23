import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { syncMeetings } from "@/lib/google-calendar";
import { processCalendarAttendees, drainEnrichmentQueue } from "@/lib/calendar-enrichment";
import { generateMeetingIntelligence } from "@/lib/meeting-intelligence";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const connectedUsers = await db
    .select({ userId: calendarConnections.userId })
    .from(calendarConnections)
    .where(eq(calendarConnections.status, "connected"));

  const results: {
    userId: string;
    synced: number;
    removed: number;
    intelligenceGenerated: number;
    enriched: number;
    error?: string;
  }[] = [];

  for (const { userId } of connectedUsers) {
    try {
      const syncResult = await syncMeetings(userId);

      await processCalendarAttendees(userId);
      const enriched = await drainEnrichmentQueue();
      const intelligenceGenerated = await generateMeetingIntelligence(userId);

      results.push({
        userId,
        synced: syncResult.synced,
        removed: syncResult.removed,
        intelligenceGenerated,
        enriched,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        userId,
        synced: 0,
        removed: 0,
        intelligenceGenerated: 0,
        enriched: 0,
        error: message,
      });
    }
  }

  return NextResponse.json({
    usersProcessed: connectedUsers.length,
    results,
  });
}
