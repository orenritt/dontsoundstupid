import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { peerOrganizations, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { derivePeerOrganizations } from "@/lib/enrichment";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db
    .select()
    .from(peerOrganizations)
    .where(eq(peerOrganizations.userId, session.user.id));

  if (existing.length > 0) {
    return NextResponse.json({ peers: existing });
  }

  const [user] = await db
    .select({ company: users.company, title: users.title })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.company) {
    return NextResponse.json({ peers: [] });
  }

  const derived = await derivePeerOrganizations(
    user.company,
    undefined,
    user.title ?? undefined,
    undefined
  );

  const inserted = [];
  for (const org of derived) {
    const [row] = await db
      .insert(peerOrganizations)
      .values({
        userId: session.user.id,
        name: org.name,
        domain: org.domain,
        description: org.description,
      })
      .returning();
    inserted.push(row);
  }

  return NextResponse.json({ peers: inserted });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reviews, additionalOrgs } = await request.json();

  if (Array.isArray(reviews)) {
    for (const review of reviews) {
      await db
        .update(peerOrganizations)
        .set({
          confirmed: review.confirmed,
          comment: review.comment || null,
        })
        .where(eq(peerOrganizations.id, review.id));
    }
  }

  if (Array.isArray(additionalOrgs)) {
    for (const org of additionalOrgs) {
      await db.insert(peerOrganizations).values({
        userId: session.user.id,
        name: org.name,
        domain: org.domain || null,
        confirmed: true,
        source: "user-added",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
