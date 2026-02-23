import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { seedKnowledgeGraph } from "@/lib/knowledge-seed";
import { runPipeline } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  await db
    .update(users)
    .set({ onboardingStatus: "completed" })
    .where(eq(users.id, userId));

  try {
    await seedKnowledgeGraph(userId);
    const briefingId = await runPipeline(userId);
    return NextResponse.json({ ok: true, briefingId });
  } catch (e) {
    console.error("Post-onboarding pipeline failed:", e);
    return NextResponse.json({ ok: true, briefingId: null });
  }
}
