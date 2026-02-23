import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { newsletterRegistry } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tagParam = request.nextUrl.searchParams.get("tag");

  const query = db
    .select()
    .from(newsletterRegistry)
    .where(eq(newsletterRegistry.status, "active"));

  const newsletters = await query;

  const filtered = tagParam
    ? newsletters.filter((n) =>
        (n.industryTags as string[]).some(
          (t) => t.toLowerCase() === tagParam.toLowerCase()
        )
      )
    : newsletters;

  return NextResponse.json({ newsletters: filtered });
}
