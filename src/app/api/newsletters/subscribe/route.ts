import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userNewsletterSubscriptions, newsletterRegistry } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newsletterId } = await request.json();
  if (!newsletterId) {
    return NextResponse.json(
      { error: "newsletterId is required" },
      { status: 400 }
    );
  }

  const [newsletter] = await db
    .select()
    .from(newsletterRegistry)
    .where(eq(newsletterRegistry.id, newsletterId))
    .limit(1);

  if (!newsletter) {
    return NextResponse.json(
      { error: "Newsletter not found" },
      { status: 404 }
    );
  }

  await db
    .insert(userNewsletterSubscriptions)
    .values({
      userId: session.user.id,
      newsletterId,
    })
    .onConflictDoNothing();

  return NextResponse.json({ status: "subscribed", newsletterId });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newsletterId } = await request.json();
  if (!newsletterId) {
    return NextResponse.json(
      { error: "newsletterId is required" },
      { status: 400 }
    );
  }

  await db
    .delete(userNewsletterSubscriptions)
    .where(
      and(
        eq(userNewsletterSubscriptions.userId, session.user.id),
        eq(userNewsletterSubscriptions.newsletterId, newsletterId)
      )
    );

  return NextResponse.json({ status: "unsubscribed", newsletterId });
}
