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

  const rows = await db
    .select({
      id: briefings.id,
      items: briefings.items,
      createdAt: briefings.generatedAt,
      modelUsed: briefings.modelUsed,
    })
    .from(briefings)
    .where(eq(briefings.userId, session.user.id))
    .orderBy(desc(briefings.generatedAt))
    .limit(30);

  return NextResponse.json({ briefings: rows });
}
