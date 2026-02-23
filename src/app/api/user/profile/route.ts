import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  userProfiles,
  impressContacts,
  peerOrganizations,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { parseTranscriptAsync } from "@/lib/parse-transcript";
import { generateContentUniverse } from "@/lib/content-universe";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      linkedinUrl: users.linkedinUrl,
      linkedinPhotoUrl: users.linkedinPhotoUrl,
      title: users.title,
      company: users.company,
      onboardingStatus: users.onboardingStatus,
      transcript: userProfiles.conversationTranscript,
      conversationInputMethod: userProfiles.conversationInputMethod,
      initiatives: userProfiles.parsedInitiatives,
      concerns: userProfiles.parsedConcerns,
      topics: userProfiles.parsedTopics,
      knowledgeGaps: userProfiles.parsedKnowledgeGaps,
      expertAreas: userProfiles.parsedExpertAreas,
      weakAreas: userProfiles.parsedWeakAreas,
      rapidFireClassifications: userProfiles.rapidFireClassifications,
      deliveryChannel: userProfiles.deliveryChannel,
      deliveryTime: userProfiles.deliveryTime,
      deliveryTimezone: userProfiles.deliveryTimezone,
      profileUpdatedAt: userProfiles.updatedAt,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const contacts = await db
    .select({
      id: impressContacts.id,
      name: impressContacts.name,
      title: impressContacts.title,
      company: impressContacts.company,
      linkedinUrl: impressContacts.linkedinUrl,
      photoUrl: impressContacts.photoUrl,
    })
    .from(impressContacts)
    .where(eq(impressContacts.userId, session.user.id));

  const peers = await db
    .select({
      id: peerOrganizations.id,
      name: peerOrganizations.name,
      domain: peerOrganizations.domain,
      description: peerOrganizations.description,
      entityType: peerOrganizations.entityType,
      confirmed: peerOrganizations.confirmed,
    })
    .from(peerOrganizations)
    .where(eq(peerOrganizations.userId, session.user.id));

  return NextResponse.json({
    ...row,
    impressContacts: contacts,
    peerOrganizations: peers,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    transcript,
    inputMethod,
    linkedinUrl,
    topics,
    initiatives,
    concerns,
    knowledgeGaps,
    expertAreas,
    weakAreas,
    rapidFireClassifications,
  } = body;

  const profileUpdate: Record<string, unknown> = { updatedAt: new Date() };
  const userUpdate: Record<string, unknown> = {};

  if (linkedinUrl !== undefined) {
    userUpdate.linkedinUrl = linkedinUrl;
  }

  if (transcript !== undefined) {
    if (transcript.length < 20) {
      return NextResponse.json(
        { error: "Please tell us more (at least a few sentences)" },
        { status: 400 }
      );
    }
    profileUpdate.conversationTranscript = transcript;
    profileUpdate.conversationInputMethod = inputMethod || "text";
  }

  if (topics !== undefined) profileUpdate.parsedTopics = topics;
  if (initiatives !== undefined) profileUpdate.parsedInitiatives = initiatives;
  if (concerns !== undefined) profileUpdate.parsedConcerns = concerns;
  if (knowledgeGaps !== undefined) profileUpdate.parsedKnowledgeGaps = knowledgeGaps;
  if (expertAreas !== undefined) profileUpdate.parsedExpertAreas = expertAreas;
  if (weakAreas !== undefined) profileUpdate.parsedWeakAreas = weakAreas;
  if (rapidFireClassifications !== undefined) profileUpdate.rapidFireClassifications = rapidFireClassifications;

  if (Object.keys(userUpdate).length > 0) {
    await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, session.user.id));
  }

  await db
    .update(userProfiles)
    .set(profileUpdate)
    .where(eq(userProfiles.userId, session.user.id));

  if (transcript !== undefined) {
    parseTranscriptAsync(session.user.id, transcript).catch(() => {
      // Error already logged and error row written inside parseTranscriptAsync
    });
  }

  const universeRelevantFieldChanged =
    topics !== undefined ||
    initiatives !== undefined ||
    concerns !== undefined ||
    rapidFireClassifications !== undefined;

  if (universeRelevantFieldChanged) {
    generateContentUniverse(session.user.id).catch((err) =>
      console.error("Content universe generation failed (non-critical)", err)
    );
  }

  return NextResponse.json({ ok: true });
}
