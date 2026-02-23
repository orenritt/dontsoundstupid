import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select({
      deliveryChannel: userProfiles.deliveryChannel,
      deliveryTime: userProfiles.deliveryTime,
      deliveryTimezone: userProfiles.deliveryTimezone,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelType, preferredTime, timezone } = await request.json();

  await db
    .update(userProfiles)
    .set({
      deliveryChannel: channelType,
      deliveryTime: preferredTime,
      deliveryTimezone: timezone,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, session.user.id));

  return NextResponse.json({ ok: true });
}
