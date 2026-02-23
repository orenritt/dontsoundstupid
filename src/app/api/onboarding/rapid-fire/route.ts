import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, rapidFireTopics } from "@/lib/schema";
import { eq } from "drizzle-orm";
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
    log.debug({ userId, rowExists: true, ready: false }, "Rapid-fire row exists but not ready");
    return NextResponse.json({ ready: false, topics: [] });
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
