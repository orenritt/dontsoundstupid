import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { briefings } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [latest] = await db
    .select()
    .from(briefings)
    .where(eq(briefings.userId, session.user.id))
    .orderBy(desc(briefings.generatedAt))
    .limit(1);

  if (!latest) {
    return NextResponse.json({ briefing: null });
  }

  return NextResponse.json({ briefing: latest });
}
