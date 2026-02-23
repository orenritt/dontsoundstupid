import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = getAuthUrl();
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calendar not configured";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
