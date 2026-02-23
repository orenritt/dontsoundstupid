import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleCallback, syncMeetings } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?calendar_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?calendar_error=no_code", request.url)
    );
  }

  try {
    await handleCallback(code, session.user.id);
    // Trigger initial sync immediately
    await syncMeetings(session.user.id).catch(() => {});
    return NextResponse.redirect(
      new URL("/settings?calendar=connected", request.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/settings?calendar_error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
