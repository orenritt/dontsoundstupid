import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  userProfiles,
  signals,
  signalProvenance,
  newsQueries,
  impressContacts,
  peerOrganizations,
  meetings,
  meetingAttendees,
} from "@/lib/schema";
import { eq, sql, gte, inArray, and } from "drizzle-orm";
import { toStringArray } from "@/lib/safe-parse";
import type { ContentUniverse } from "@/models/content-universe";

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

interface StageResult {
  stage: string;
  status: "pass" | "warn" | "fail";
  durationMs: number;
  details: Record<string, unknown>;
}

export async function POST() {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db
    .select({ id: users.id, email: users.email, name: users.name, title: users.title, company: users.company })
    .from(users)
    .where(eq(users.onboardingStatus, "completed"));

  const results: { userId: string; email: string | null; stages: StageResult[] }[] = [];

  for (const user of allUsers) {
    const stages: StageResult[] = [];

    // 1. Profile check
    let start = Date.now();
    try {
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
      const contentUniverse = profile ? (profile as Record<string, unknown>).contentUniverse as ContentUniverse | null : null;
      const topics = profile ? toStringArray(profile.parsedTopics) : [];
      const initiatives = profile ? toStringArray(profile.parsedInitiatives) : [];

      if (!profile) {
        stages.push({ stage: "profile", status: "fail", durationMs: Date.now() - start, details: { error: "No profile found" } });
      } else {
        stages.push({
          stage: "profile",
          status: topics.length === 0 ? "warn" : "pass",
          durationMs: Date.now() - start,
          details: {
            topics: topics.length,
            initiatives: initiatives.length,
            hasContentUniverse: !!contentUniverse,
            contentUniverseVersion: contentUniverse?.version ?? null,
            coreTopics: contentUniverse?.coreTopics?.length ?? 0,
            exclusions: contentUniverse?.exclusions?.length ?? 0,
            ...(topics.length === 0 ? { warning: "No parsed topics — queries will be empty" } : {}),
          },
        });
      }
    } catch (err) {
      stages.push({ stage: "profile", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 2. Query derivation check
    start = Date.now();
    try {
      const activeQueries = await db.select({ id: newsQueries.id, queryText: newsQueries.queryText, derivedFrom: newsQueries.derivedFrom }).from(newsQueries).where(and(eq(newsQueries.userId, user.id), eq(newsQueries.active, true)));
      const bySource = activeQueries.reduce((acc, q) => { acc[q.derivedFrom] = (acc[q.derivedFrom] || 0) + 1; return acc; }, {} as Record<string, number>);

      stages.push({
        stage: "queries",
        status: activeQueries.length === 0 ? "fail" : "pass",
        durationMs: Date.now() - start,
        details: {
          totalActive: activeQueries.length,
          bySource,
          sampleQueries: activeQueries.slice(0, 5).map((q) => q.queryText),
          ...(activeQueries.length === 0 ? { error: "No active queries — nothing will be fetched from news API" } : {}),
        },
      });
    } catch (err) {
      stages.push({ stage: "queries", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 3. Signal pool check
    start = Date.now();
    try {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const provRows = await db.select({ signalId: signalProvenance.signalId }).from(signalProvenance).where(eq(signalProvenance.userId, user.id));
      const signalIds = provRows.map((r) => r.signalId);

      let recentCount = 0;
      let layerBreakdown: Record<string, number> = {};
      if (signalIds.length > 0) {
        const recentSignals = await db.select({ id: signals.id, layer: signals.layer }).from(signals).where(and(inArray(signals.id, signalIds), gte(signals.ingestedAt, twoDaysAgo)));
        recentCount = recentSignals.length;
        layerBreakdown = recentSignals.reduce((acc, s) => { acc[s.layer || "unknown"] = (acc[s.layer || "unknown"] || 0) + 1; return acc; }, {} as Record<string, number>);
      }

      stages.push({
        stage: "signals",
        status: recentCount === 0 ? "fail" : recentCount < 5 ? "warn" : "pass",
        durationMs: Date.now() - start,
        details: {
          totalProvenance: signalIds.length,
          recentSignals: recentCount,
          layerBreakdown,
          ...(recentCount === 0 ? { error: "No recent signals in pool — scoring will have nothing to work with" } : {}),
          ...(recentCount > 0 && recentCount < 5 ? { warning: `Only ${recentCount} recent signals — briefing quality may suffer` } : {}),
        },
      });
    } catch (err) {
      stages.push({ stage: "signals", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 4. Impress list + peer orgs check
    start = Date.now();
    try {
      const contacts = await db.select({ id: impressContacts.id, name: impressContacts.name, company: impressContacts.company }).from(impressContacts).where(eq(impressContacts.userId, user.id));
      const peers = await db.select({ id: peerOrganizations.id, name: peerOrganizations.name, confirmed: peerOrganizations.confirmed }).from(peerOrganizations).where(eq(peerOrganizations.userId, user.id));

      stages.push({
        stage: "contacts",
        status: "pass",
        durationMs: Date.now() - start,
        details: {
          impressContacts: contacts.length,
          companiesTracked: new Set(contacts.map((c) => c.company).filter(Boolean)).size,
          peerOrgs: peers.filter((p) => p.confirmed).length,
          unconfirmedPeerOrgs: peers.filter((p) => !p.confirmed).length,
        },
      });
    } catch (err) {
      stages.push({ stage: "contacts", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 5. Calendar / meetings check
    start = Date.now();
    try {
      const now = new Date();
      const tomorrowEnd = new Date(now);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const upcomingMeetings = await db.select({ id: meetings.id, title: meetings.title, startTime: meetings.startTime }).from(meetings).where(and(eq(meetings.userId, user.id), gte(meetings.startTime, now)));
      const todayMeetings = upcomingMeetings.filter((m) => m.startTime <= tomorrowEnd);

      let attendeeCount = 0;
      if (todayMeetings.length > 0) {
        const attendees = await db.select({ id: meetingAttendees.id }).from(meetingAttendees).where(inArray(meetingAttendees.meetingId, todayMeetings.map((m) => m.id)));
        attendeeCount = attendees.length;
      }

      stages.push({
        stage: "calendar",
        status: upcomingMeetings.length === 0 ? "warn" : "pass",
        durationMs: Date.now() - start,
        details: {
          upcomingMeetings: upcomingMeetings.length,
          todayTomorrow: todayMeetings.length,
          attendeesToday: attendeeCount,
          ...(upcomingMeetings.length === 0 ? { warning: "No upcoming meetings synced — meeting prep features won't fire" } : {}),
        },
      });
    } catch (err) {
      stages.push({ stage: "calendar", status: "fail", durationMs: Date.now() - start, details: { error: err instanceof Error ? err.message : String(err) } });
    }

    // 6. API keys check
    start = Date.now();
    const apiKeys = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
      TAVILY_API_KEY: !!process.env.TAVILY_API_KEY,
      NEWSAPI_AI_KEY: !!process.env.NEWSAPI_AI_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      SERPAPI_API_KEY: !!process.env.SERPAPI_API_KEY,
    };
    const missingCritical = !apiKeys.OPENAI_API_KEY;
    const missingOptional = Object.entries(apiKeys).filter(([, v]) => !v).map(([k]) => k);

    stages.push({
      stage: "api-keys",
      status: missingCritical ? "fail" : missingOptional.length > 1 ? "warn" : "pass",
      durationMs: Date.now() - start,
      details: {
        ...apiKeys,
        ...(missingCritical ? { error: "OPENAI_API_KEY missing — scoring and composition will fail" } : {}),
        ...(missingOptional.length > 0 ? { missing: missingOptional } : {}),
      },
    });

    results.push({ userId: user.id, email: user.email, stages });
  }

  const overallHealth = results.map((r) => {
    const fails = r.stages.filter((s) => s.status === "fail").length;
    const warns = r.stages.filter((s) => s.status === "warn").length;
    return { userId: r.userId, email: r.email, fails, warns, passes: r.stages.length - fails - warns };
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    usersChecked: results.length,
    summary: {
      healthy: overallHealth.filter((h) => h.fails === 0 && h.warns === 0).length,
      warnings: overallHealth.filter((h) => h.fails === 0 && h.warns > 0).length,
      failing: overallHealth.filter((h) => h.fails > 0).length,
    },
    results,
  });
}
