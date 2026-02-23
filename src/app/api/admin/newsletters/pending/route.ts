import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { newsletterRegistry, userNewsletterSubscriptions } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await db
    .select({
      newsletter: newsletterRegistry,
      requestCount: sql<number>`(
        SELECT COUNT(*)::int FROM user_newsletter_subscriptions
        WHERE newsletter_id = ${newsletterRegistry.id}
      )`,
    })
    .from(newsletterRegistry)
    .where(eq(newsletterRegistry.status, "pending_admin_setup"))
    .orderBy(
      sql`(
        SELECT COUNT(*) FROM user_newsletter_subscriptions
        WHERE newsletter_id = ${newsletterRegistry.id}
      ) DESC`
    );

  // Stale detection: system-email newsletters with no email in 30+ days
  const stale = await db
    .select()
    .from(newsletterRegistry)
    .where(
      sql`${newsletterRegistry.ingestionMethod} = 'system_email'
        AND ${newsletterRegistry.status} = 'active'
        AND (
          ${newsletterRegistry.lastEmailReceivedAt} IS NULL
          OR ${newsletterRegistry.lastEmailReceivedAt} < NOW() - INTERVAL '30 days'
        )`
    );

  return NextResponse.json({ pending, stale });
}
