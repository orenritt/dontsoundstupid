import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { impressContacts } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { enrichLinkedinProfile } from "@/lib/enrichment";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await db
    .select()
    .from(impressContacts)
    .where(
      and(
        eq(impressContacts.userId, session.user.id),
        eq(impressContacts.active, true)
      )
    );

  return NextResponse.json(contacts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { linkedinUrl } = await request.json();
  if (!linkedinUrl) {
    return NextResponse.json(
      { error: "linkedinUrl is required" },
      { status: 400 }
    );
  }

  try {
    const enriched = await enrichLinkedinProfile(linkedinUrl);

    const [contact] = await db
      .insert(impressContacts)
      .values({
        userId: session.user.id,
        linkedinUrl: enriched.linkedinUrl,
        name: enriched.name,
        title: enriched.title,
        company: enriched.company,
        photoUrl: enriched.photoUrl,
        source: "settings",
      })
      .returning();

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Failed to add impress contact:", error);
    return NextResponse.json(
      { error: "Failed to add contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await request.json();
  if (!contactId) {
    return NextResponse.json(
      { error: "contactId is required" },
      { status: 400 }
    );
  }

  await db
    .update(impressContacts)
    .set({ active: false })
    .where(
      and(
        eq(impressContacts.id, contactId),
        eq(impressContacts.userId, session.user.id)
      )
    );

  return NextResponse.json({ ok: true });
}
