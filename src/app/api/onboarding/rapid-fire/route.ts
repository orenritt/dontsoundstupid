import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, rapidFireTopics } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { parseTranscriptAsync } from "@/lib/parse-transcript";
import { createLogger } from "@/lib/logger";

const log = createLogger("onboarding:rapid-fire");

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [result] = await db
    .select()
    .from(rapidFireTopics)
    .where(eq(rapidFireTopics.userId, userId))
    .limit(1);

  if (!result) {
    log.debug({ userId }, "No rapid-fire row exists yet — still processing");
    return NextResponse.json({ ready: false, topics: [] });
  }

  if (!result.ready) {
    const ageMs = Date.now() - new Date(result.createdAt).getTime();
    const stale = ageMs > 60_000;
    if (stale) {
      log.warn({ userId, ageMs }, "Rapid-fire row is stale (>60s) — likely failed");
    }
    return NextResponse.json({ ready: false, topics: [], ...(stale && { failed: true }) });
  }

  const topicCount = Array.isArray(result.topics) ? result.topics.length : 0;
  log.info({ userId, topicCount }, "Rapid-fire topics ready");
  return NextResponse.json({ ready: true, topics: result.topics });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { classifications } = await request.json();
  if (!Array.isArray(classifications)) {
    log.warn({ userId }, "POST missing classifications array");
    return NextResponse.json(
      { error: "Classifications array required" },
      { status: 400 }
    );
  }

  log.info({ userId, classificationCount: classifications.length }, "Saving rapid-fire classifications");

  await db
    .update(userProfiles)
    .set({
      rapidFireClassifications: classifications,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));

  return NextResponse.json({ ok: true });
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [profile] = await db
    .select({ conversationTranscript: userProfiles.conversationTranscript })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile?.conversationTranscript) {
    log.warn({ userId }, "PATCH retry — no transcript found");
    return NextResponse.json({ error: "No transcript to re-analyze" }, { status: 400 });
  }

  log.info({ userId }, "PATCH retry — re-triggering parseTranscriptAsync");

  await db
    .update(rapidFireTopics)
    .set({ ready: false, topics: [], createdAt: new Date() })
    .where(eq(rapidFireTopics.userId, userId));

  parseTranscriptAsync(userId, profile.conversationTranscript).catch(() => {
    // Error already logged and error row written inside parseTranscriptAsync
  });

  return NextResponse.json({ ok: true, retrying: true });
}
