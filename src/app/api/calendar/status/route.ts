import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calendarConnections, meetings, meetingAttendees } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [connection] = await db
    .select({
      provider: calendarConnections.provider,
      status: calendarConnections.status,
      lastSyncAt: calendarConnections.lastSyncAt,
    })
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, session.user.id))
    .limit(1);

  if (!connection || connection.status === "disconnected") {
    return NextResponse.json({ connected: false, provider: null, meetings: [] });
  }

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingMeetings = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, session.user.id),
        sql`${meetings.startTime} > ${now}`,
        sql`${meetings.startTime} <= ${sevenDaysOut}`
      )
    )
    .orderBy(meetings.startTime);

  const meetingsWithAttendees = await Promise.all(
    upcomingMeetings.map(async (m) => {
      const attendees = await db
        .select()
        .from(meetingAttendees)
        .where(eq(meetingAttendees.meetingId, m.id));
      return { ...m, attendees };
    })
  );

  return NextResponse.json({
    connected: true,
    provider: connection.provider,
    lastSyncAt: connection.lastSyncAt,
    meetings: meetingsWithAttendees,
  });
}
