import { google, calendar_v3 } from "googleapis";
import { db } from "./db";
import {
  calendarConnections,
  meetings,
  meetingAttendees,
} from "./schema";
import { eq, and, sql } from "drizzle-orm";
import { createLogger } from "./logger";

const log = createLogger("google-calendar");

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/api/calendar/callback`
  );
}

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
}

export async function handleCallback(code: string, userId: string): Promise<void> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("No access token received from Google");
  }

  await db
    .insert(calendarConnections)
    .values({
      userId,
      provider: "google",
      status: "connected",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
    })
    .onConflictDoUpdate({
      target: calendarConnections.userId,
      set: {
        provider: "google",
        status: "connected",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
      },
    });

  log.info({ userId }, "Google Calendar connected");
}

export async function disconnectCalendar(userId: string): Promise<void> {
  await db
    .update(calendarConnections)
    .set({ status: "disconnected", accessToken: null, refreshToken: null })
    .where(eq(calendarConnections.userId, userId));

  log.info({ userId }, "Google Calendar disconnected");
}

async function getAuthedClient(userId: string) {
  const [conn] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.status, "connected")
      )
    )
    .limit(1);

  if (!conn?.accessToken) return null;

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken ?? undefined,
  });

  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db
        .update(calendarConnections)
        .set({ accessToken: tokens.access_token })
        .where(eq(calendarConnections.userId, userId));
    }
  });

  return { client, connection: conn };
}

export async function syncMeetings(userId: string): Promise<{
  synced: number;
  removed: number;
  errors: number;
}> {
  const ulog = log.child({ userId });
  const authed = await getAuthedClient(userId);

  if (!authed) {
    ulog.debug("No active calendar connection — skipping sync");
    return { synced: 0, removed: 0, errors: 0 };
  }

  const calendar = google.calendar({ version: "v3", auth: authed.client });
  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let events: calendar_v3.Schema$Event[] = [];
  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: sevenDaysOut.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });
    events = response.data.items ?? [];
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string };
    if (gErr.code === 401 || gErr.code === 403) {
      ulog.warn("Calendar token expired or revoked — marking disconnected");
      await db
        .update(calendarConnections)
        .set({ status: "disconnected" })
        .where(eq(calendarConnections.userId, userId));
      return { synced: 0, removed: 0, errors: 1 };
    }
    throw err;
  }

  let synced = 0;
  let errors = 0;
  const seenExternalIds = new Set<string>();

  for (const event of events) {
    if (!event.id || !event.summary) continue;
    if (event.status === "cancelled") continue;

    seenExternalIds.add(event.id);

    const startTime = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
        ? new Date(event.start.date)
        : null;

    const endTime = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : event.end?.date
        ? new Date(event.end.date)
        : null;

    if (!startTime) continue;

    const hangoutLink = event.hangoutLink;
    const conferenceUri = event.conferenceData?.entryPoints?.[0]?.uri;
    const virtualUrl = hangoutLink || conferenceUri || null;
    const isVirtual = !!virtualUrl || !!event.conferenceData;

    try {
      const [upserted] = await db
        .insert(meetings)
        .values({
          userId,
          externalId: event.id,
          title: event.summary,
          description: event.description?.slice(0, 2000) ?? null,
          startTime,
          endTime,
          location: event.location ?? null,
          isVirtual,
          virtualUrl,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [meetings.userId, meetings.externalId],
          set: {
            title: event.summary,
            description: event.description?.slice(0, 2000) ?? null,
            startTime,
            endTime,
            location: event.location ?? null,
            isVirtual,
            virtualUrl,
            syncedAt: new Date(),
          },
        })
        .returning();

      if (upserted && event.attendees?.length) {
        for (const attendee of event.attendees) {
          if (attendee.self) continue;
          if (!attendee.email && !attendee.displayName) continue;

          await db
            .insert(meetingAttendees)
            .values({
              meetingId: upserted.id,
              name: attendee.displayName ?? null,
              email: attendee.email ?? null,
            })
            .onConflictDoNothing();
        }
      }

      synced++;
    } catch (err) {
      ulog.error({ err, eventId: event.id }, "Failed to upsert meeting");
      errors++;
    }
  }

  // Remove meetings that no longer exist in Google Calendar
  const existingMeetings = await db
    .select({ id: meetings.id, externalId: meetings.externalId })
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        sql`${meetings.startTime} > NOW()`
      )
    );

  let removed = 0;
  for (const m of existingMeetings) {
    if (m.externalId && !seenExternalIds.has(m.externalId)) {
      await db.delete(meetingAttendees).where(eq(meetingAttendees.meetingId, m.id));
      await db.delete(meetings).where(eq(meetings.id, m.id));
      removed++;
    }
  }

  await db
    .update(calendarConnections)
    .set({ lastSyncAt: new Date() })
    .where(eq(calendarConnections.userId, userId));

  ulog.info({ synced, removed, errors, totalEvents: events.length }, "Calendar sync complete");
  return { synced, removed, errors };
}
