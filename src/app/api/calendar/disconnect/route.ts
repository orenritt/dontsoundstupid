import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { disconnectCalendar } from "@/lib/google-calendar";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectCalendar(session.user.id);
  return NextResponse.json({ success: true });
}
