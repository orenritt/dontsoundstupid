import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channel, time, timezone } = await request.json();

  await db
    .update(userProfiles)
    .set({
      deliveryChannel: channel || "email",
      deliveryTime: time || "07:00",
      deliveryTimezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, session.user.id));

  return NextResponse.json({ ok: true });
}
