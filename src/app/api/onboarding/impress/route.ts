import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { impressContacts } from "@/lib/schema";
import { enrichLinkedinProfile } from "@/lib/enrichment";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { linkedinUrls } = await request.json();
  if (!Array.isArray(linkedinUrls) || linkedinUrls.length === 0) {
    return NextResponse.json(
      { error: "At least one LinkedIn URL required" },
      { status: 400 }
    );
  }

  const contacts = [];
  for (const url of linkedinUrls) {
    const enriched = await enrichLinkedinProfile(url);
    const [contact] = await db
      .insert(impressContacts)
      .values({
        userId: session.user.id,
        linkedinUrl: url,
        name: enriched.name,
        title: enriched.title,
        company: enriched.company,
        photoUrl: enriched.photoUrl,
        source: "onboarding",
      })
      .returning();
    contacts.push(contact);
  }

  return NextResponse.json({ contacts });
}
