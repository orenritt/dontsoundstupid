import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { peerOrganizations, users, userProfiles } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { derivePeerOrganizations } from "@/lib/enrichment";
import { toStringArray } from "@/lib/safe-parse";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "true";

  if (refresh) {
    await db
      .delete(peerOrganizations)
      .where(
        and(
          eq(peerOrganizations.userId, session.user.id),
          eq(peerOrganizations.source, "system-suggested")
        )
      );
  }

  if (!refresh) {
    const existing = await db
      .select()
      .from(peerOrganizations)
      .where(eq(peerOrganizations.userId, session.user.id));

    if (existing.length > 0) {
      return NextResponse.json({ peers: existing });
    }
  }

  const [user] = await db
    .select({ company: users.company, title: users.title })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.company) {
    return NextResponse.json({ peers: [] });
  }

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id))
    .limit(1);

  const profileContext = profile
    ? {
        topics: toStringArray(profile.parsedTopics),
        initiatives: toStringArray(profile.parsedInitiatives),
        concerns: toStringArray(profile.parsedConcerns),
        weakAreas: toStringArray(profile.parsedWeakAreas),
        expertAreas: toStringArray(profile.parsedExpertAreas),
        knowledgeGaps: toStringArray(profile.parsedKnowledgeGaps),
      }
    : undefined;

  const derived = await derivePeerOrganizations(
    user.company,
    undefined,
    user.title ?? undefined,
    undefined,
    profileContext
  );

  for (const org of derived) {
    await db
      .insert(peerOrganizations)
      .values({
        userId: session.user.id,
        name: org.name,
        domain: org.domain,
        description: org.description,
        entityType: org.entityType || "company",
      })
      .onConflictDoNothing();
  }

  const allPeers = await db
    .select()
    .from(peerOrganizations)
    .where(eq(peerOrganizations.userId, session.user.id));

  return NextResponse.json({ peers: allPeers });
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
        entityType: org.entityType || "company",
        confirmed: true,
        source: "user-added",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
