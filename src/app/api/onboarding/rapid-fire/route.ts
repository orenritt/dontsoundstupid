import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, rapidFireTopics } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [result] = await db
    .select()
    .from(rapidFireTopics)
    .where(eq(rapidFireTopics.userId, session.user.id))
    .limit(1);

  if (!result || !result.ready) {
    return NextResponse.json({ ready: false, topics: [] });
  }

  return NextResponse.json({ ready: true, topics: result.topics });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classifications } = await request.json();
  if (!Array.isArray(classifications)) {
    return NextResponse.json(
      { error: "Classifications array required" },
      { status: 400 }
    );
  }

  await db
    .update(userProfiles)
    .set({
      rapidFireClassifications: classifications,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, session.user.id));

  return NextResponse.json({ ok: true });
}
