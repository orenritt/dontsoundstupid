import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { enrichLinkedinProfile } from "@/lib/enrichment";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { linkedinUrl } = await request.json();
  if (!linkedinUrl || !linkedinUrl.includes("linkedin.com/in/")) {
    return NextResponse.json(
      { error: "Valid LinkedIn URL required" },
      { status: 400 }
    );
  }

  try {
    const enriched = await enrichLinkedinProfile(linkedinUrl);

    await db
      .update(users)
      .set({
        linkedinUrl,
        name: enriched.name,
        title: enriched.title,
        company: enriched.company,
        linkedinPhotoUrl: enriched.photoUrl,
        onboardingStatus: "in_progress",
      })
      .where(eq(users.id, session.user.id));

    const existing = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(userProfiles).values({ userId: session.user.id });
    }

    return NextResponse.json({ enriched });
  } catch (error) {
    console.error("LinkedIn enrichment failed:", error);
    return NextResponse.json(
      { error: "Failed to process LinkedIn profile" },
      { status: 500 }
    );
  }
}
