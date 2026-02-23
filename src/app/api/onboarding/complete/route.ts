import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { seedKnowledgeGraph } from "@/lib/knowledge-seed";
import { runPipeline } from "@/lib/pipeline";

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

  seedKnowledgeGraph(userId)
    .then(() => runPipeline(userId))
    .catch(console.error);

  return NextResponse.json({ ok: true });
}
