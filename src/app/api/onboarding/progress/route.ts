import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  userProfiles,
  impressContacts,
  peerOrganizations,
} from "@/lib/schema";
import { eq, and, isNotNull } from "drizzle-orm";

type Step =
  | "linkedin"
  | "conversation"
  | "impress"
  | "rapid-fire"
  | "peer-review"
  | "delivery"
  | "calendar"
  | "complete";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [user] = await db
    .select({
      onboardingStatus: users.onboardingStatus,
      name: users.name,
      linkedinUrl: users.linkedinUrl,
      linkedinPhotoUrl: users.linkedinPhotoUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.onboardingStatus === "completed") {
    return NextResponse.json({ resumeStep: "completed" as const });
  }

  const [profile] = await db
    .select({
      conversationTranscript: userProfiles.conversationTranscript,
      rapidFireClassifications: userProfiles.rapidFireClassifications,
      deliveryChannel: userProfiles.deliveryChannel,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const contacts = await db
    .select({ name: impressContacts.name, photoUrl: impressContacts.photoUrl })
    .from(impressContacts)
    .where(eq(impressContacts.userId, userId));

  const confirmedPeers = await db
    .select({ id: peerOrganizations.id })
    .from(peerOrganizations)
    .where(
      and(
        eq(peerOrganizations.userId, userId),
        isNotNull(peerOrganizations.confirmed)
      )
    )
    .limit(1);

  let resumeStep: Step = "linkedin";

  if (user.linkedinUrl) {
    resumeStep = "conversation";
  }
  if (profile?.conversationTranscript) {
    resumeStep = "impress";
  }
  if (contacts.length > 0) {
    resumeStep = "rapid-fire";
  }
  const classifications = profile?.rapidFireClassifications as unknown[];
  if (classifications && classifications.length > 0) {
    resumeStep = "peer-review";
  }
  if (confirmedPeers.length > 0) {
    resumeStep = "delivery";
  }
  if (profile?.deliveryChannel) {
    resumeStep = "calendar";
  }

  return NextResponse.json({
    resumeStep,
    userData: {
      name: user.name ?? undefined,
      photoUrl: user.linkedinPhotoUrl ?? undefined,
      contacts: contacts
        .filter((c) => c.name)
        .map((c) => ({ name: c.name!, photoUrl: c.photoUrl ?? "" })),
    },
  });
}
