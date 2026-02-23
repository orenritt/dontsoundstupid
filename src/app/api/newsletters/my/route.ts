import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  userNewsletterSubscriptions,
  newsletterRegistry,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await db
    .select({
      subscriptionId: userNewsletterSubscriptions.id,
      subscribedAt: userNewsletterSubscriptions.createdAt,
      newsletter: {
        id: newsletterRegistry.id,
        name: newsletterRegistry.name,
        description: newsletterRegistry.description,
        websiteUrl: newsletterRegistry.websiteUrl,
        industryTags: newsletterRegistry.industryTags,
        status: newsletterRegistry.status,
        logoUrl: newsletterRegistry.logoUrl,
      },
    })
    .from(userNewsletterSubscriptions)
    .innerJoin(
      newsletterRegistry,
      eq(userNewsletterSubscriptions.newsletterId, newsletterRegistry.id)
    )
    .where(eq(userNewsletterSubscriptions.userId, session.user.id));

  return NextResponse.json({ subscriptions });
}
