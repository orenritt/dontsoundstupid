import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { impressContacts } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { runImpressDeepDive } from "@/lib/impress-deep-dive";

export async function POST(request: Request) {
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

  const [contact] = await db
    .select()
    .from(impressContacts)
    .where(
      and(
        eq(impressContacts.id, contactId),
        eq(impressContacts.userId, session.user.id),
        eq(impressContacts.active, true)
      )
    )
    .limit(1);

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (contact.researchStatus === "pending") {
    return NextResponse.json({ status: "already_pending" });
  }

  const isReEnrichment =
    contact.researchStatus === "completed" && contact.enrichmentVersion > 0;

  await db
    .update(impressContacts)
    .set({ researchStatus: "pending" })
    .where(eq(impressContacts.id, contactId));

  runImpressDeepDive(contactId, session.user.id, {
    depth: "full",
    isReEnrichment,
  }).catch((err) =>
    console.error("Deep dive failed:", err)
  );

  return NextResponse.json({ status: "pending" });
}
