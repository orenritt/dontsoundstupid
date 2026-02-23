import { db } from "./db";
import {
  users,
  userProfiles,
  impressContacts,
  peerOrganizations,
  feedbackSignals,
} from "./schema";
import { eq, desc, gte } from "drizzle-orm";
import { chat } from "./llm";
import { toStringArray } from "./safe-parse";
import { createLogger } from "./logger";
import type { ContentUniverse } from "../models/content-universe";

const log = createLogger("content-universe");

interface GenerationInputs {
  transcript: string | null;
  topics: string[];
  initiatives: string[];
  concerns: string[];
  expertAreas: string[];
  weakAreas: string[];
  knowledgeGaps: string[];
  title: string | null;
  company: string | null;
  impressCompanies: string[];
  impressFocusAreas: string[];
  peerOrgNames: string[];
  rapidFireClassifications: { topic: string; context: string; response: string }[];
  existingExclusions: string[];
  feedbackExclusionCandidates: string[];
}

function inputsHash(inputs: GenerationInputs): string {
  const key = JSON.stringify({
    topics: inputs.topics.sort(),
    initiatives: inputs.initiatives.sort(),
    concerns: inputs.concerns.sort(),
    expertAreas: inputs.expertAreas.sort(),
    weakAreas: inputs.weakAreas.sort(),
    knowledgeGaps: inputs.knowledgeGaps.sort(),
    title: inputs.title,
    company: inputs.company,
    notRelevant: inputs.rapidFireClassifications
      .filter((r) => r.response === "not-relevant")
      .map((r) => r.topic)
      .sort(),
    feedbackExclusions: inputs.feedbackExclusionCandidates.sort(),
  });
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const ch = key.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return String(hash);
}

function isSparseProfile(inputs: GenerationInputs): boolean {
  return inputs.topics.length < 3 && inputs.initiatives.length < 2;
}

function buildGenerationPrompt(inputs: GenerationInputs): string {
  const sparse = isSparseProfile(inputs);

  const notRelevantTopics = inputs.rapidFireClassifications
    .filter((r) => r.response === "not-relevant")
    .map((r) => r.topic);

  const allExclusions = [
    ...new Set([...inputs.existingExclusions, ...inputs.feedbackExclusionCandidates, ...notRelevantTopics]),
  ];

  return `You are a content universe analyst. Given a professional's full profile, define their EXACT content universe — the tight, specific intersection of topics that defines what they need to know about.

THE PROFESSIONAL:
- Role: ${inputs.title || "Professional"} at ${inputs.company || "their company"}
- Topics they track: ${inputs.topics.length > 0 ? inputs.topics.join(", ") : "not specified"}
- Current initiatives: ${inputs.initiatives.length > 0 ? inputs.initiatives.join("; ") : "none specified"}
- Key concerns: ${inputs.concerns.length > 0 ? inputs.concerns.join("; ") : "none specified"}
- Expert in: ${inputs.expertAreas.length > 0 ? inputs.expertAreas.join(", ") : "not specified"}
- Wants to learn: ${inputs.weakAreas.length > 0 ? inputs.weakAreas.join(", ") : "not specified"}
- Knowledge gaps: ${inputs.knowledgeGaps.length > 0 ? inputs.knowledgeGaps.join(", ") : "not specified"}
${inputs.impressCompanies.length > 0 ? `- Tracks these companies: ${inputs.impressCompanies.join(", ")}` : ""}
${inputs.impressFocusAreas.length > 0 ? `- Impress contact focus areas: ${inputs.impressFocusAreas.join(", ")}` : ""}
${inputs.peerOrgNames.length > 0 ? `- Peer organizations: ${inputs.peerOrgNames.join(", ")}` : ""}
${inputs.transcript ? `- Raw conversation excerpt: "${inputs.transcript.slice(0, 1000)}"` : ""}

${allExclusions.length > 0 ? `TOPICS THE USER HAS EXPLICITLY REJECTED OR DOESN'T WANT:\n${allExclusions.map((e) => `- ${e}`).join("\n")}` : ""}

YOUR TASK:
1. Write a "definition" — 2-4 sentences describing their EXACT content niche. Be specific. Capture the intersection, not the parts.

2. Write "coreTopics" — 3-8 intersectional descriptors that define what's IN scope. These are phrases, not single words. They capture the user's specific position at the intersection of fields.
   ${sparse ? "Since the profile is sparse, use slightly broader descriptors to avoid empty results. Still be intersectional, but allow more scope." : "Be as specific as the profile allows. If they said 'nature-based insurance for coral reefs', the core topic is 'nature-based insurance for coral reef restoration', NOT 'insurtech'."}

3. Write "exclusions" — 5-15 parent categories, adjacent fields, and common misattributions to REJECT. These are the topics that search engines and news feeds would confuse with the user's niche but that the user does NOT care about.
   ${sparse ? "Keep the exclusion list shorter (5-8 items) since we have less certainty about what's out of scope." : "Be aggressive. Include parent categories, sibling categories, and commonly confused adjacent fields."}

4. Write "seismicThreshold" — a 1-2 sentence description of the ONLY circumstances under which content outside this universe should be admitted. This should be extremely narrow: specific named entities, specific types of concrete events. NOT vague criteria like "major industry trends."
   ${sparse ? "Be slightly more permissive since the profile is sparse — allow major events in the broader industry, not just the narrow niche." : "Be very narrow. Only seismic, landscape-changing events."}

RULES:
- coreTopics must be INTERSECTIONAL — they combine multiple aspects of the user's position. Never use a single broad keyword.
- exclusions must include parent categories that subsume the user's niche. If they work in "parametric insurance for coral reefs", exclude "general insurtech", "digital claims", "cyber insurance", etc.
- The seismicThreshold must reference specific types of entities and events, not vague importance.
${allExclusions.length > 0 ? "- The explicit rejections listed above MUST appear in your exclusions list." : ""}

Return ONLY a JSON object, no markdown:
{"definition": "...", "coreTopics": [...], "exclusions": [...], "seismicThreshold": "..."}`;
}

async function collectInputs(userId: string): Promise<GenerationInputs | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!user || !profile) return null;

  const contacts = await db
    .select()
    .from(impressContacts)
    .where(eq(impressContacts.userId, userId));

  const peers = await db
    .select()
    .from(peerOrganizations)
    .where(eq(peerOrganizations.userId, userId));

  const impressCompanies = [
    ...new Set(
      contacts
        .map((c) => c.company)
        .filter((c): c is string => !!c && c.length > 0)
    ),
  ];

  const impressFocusAreas: string[] = [];
  for (const c of contacts) {
    const dd = c.deepDiveData as { focusAreas?: string[]; interests?: string[] } | null;
    if (dd) {
      if (dd.focusAreas) impressFocusAreas.push(...dd.focusAreas);
      if (dd.interests) impressFocusAreas.push(...dd.interests);
    }
  }

  const existing = profile.contentUniverse as ContentUniverse | null;

  return {
    transcript: profile.conversationTranscript,
    topics: toStringArray(profile.parsedTopics),
    initiatives: toStringArray(profile.parsedInitiatives),
    concerns: toStringArray(profile.parsedConcerns),
    expertAreas: toStringArray(profile.parsedExpertAreas),
    weakAreas: toStringArray(profile.parsedWeakAreas),
    knowledgeGaps: toStringArray(profile.parsedKnowledgeGaps),
    title: user.title,
    company: user.company,
    impressCompanies,
    impressFocusAreas: [...new Set(impressFocusAreas)],
    peerOrgNames: peers.filter((p) => p.confirmed !== false).map((p) => p.name),
    rapidFireClassifications: (profile.rapidFireClassifications as { topic: string; context: string; response: string }[]) || [],
    existingExclusions: existing?.exclusions || [],
    feedbackExclusionCandidates: [],
  };
}

async function collectFeedbackExclusions(userId: string, sinceDate: Date | null): Promise<string[]> {
  if (!sinceDate) return [];

  const feedback = await db
    .select({ type: feedbackSignals.type, topic: feedbackSignals.topic })
    .from(feedbackSignals)
    .where(eq(feedbackSignals.userId, userId))
    .orderBy(desc(feedbackSignals.createdAt));

  const relevantFeedback = sinceDate
    ? feedback.filter((f) => {
        return (f.type === "tune-less" || f.type === "not-novel") && f.topic;
      })
    : [];

  return relevantFeedback
    .map((f) => f.topic!)
    .filter((t) => t.length > 0);
}

export async function generateContentUniverse(
  userId: string,
  feedbackExclusionCandidates: string[] = []
): Promise<ContentUniverse | null> {
  const ulog = log.child({ userId });
  ulog.info("Starting content universe generation");

  const inputs = await collectInputs(userId);
  if (!inputs) {
    ulog.warn("User/profile not found — cannot generate content universe");
    return null;
  }

  inputs.feedbackExclusionCandidates = feedbackExclusionCandidates;

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const existing = profile?.contentUniverse as ContentUniverse | null;
  const currentHash = inputsHash(inputs);

  if (existing && existing.generatedFrom?.includes(`hash:${currentHash}`)) {
    ulog.info({ version: existing.version }, "Inputs unchanged — skipping generation, updating timestamp");
    const updated: ContentUniverse = {
      ...existing,
      generatedAt: new Date().toISOString(),
    };
    await db
      .update(userProfiles)
      .set({ contentUniverse: updated, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));
    return updated;
  }

  const prompt = buildGenerationPrompt(inputs);

  const response = await chat(
    [
      { role: "system", content: prompt },
      { role: "user", content: "Generate the content universe for this professional." },
    ],
    { model: "gpt-4o-mini", temperature: 0.3, maxTokens: 2048 }
  );

  let parsed: { definition: string; coreTopics: string[]; exclusions: string[]; seismicThreshold: string };
  try {
    const cleaned = response.content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    ulog.error({ err, responseSnippet: response.content.slice(0, 300) }, "Failed to parse content universe LLM response");
    return null;
  }

  if (!parsed.definition || !Array.isArray(parsed.coreTopics) || !Array.isArray(parsed.exclusions)) {
    ulog.error("LLM response missing required fields");
    return null;
  }

  const mergedExclusions = [
    ...new Set([
      ...parsed.exclusions,
      ...inputs.existingExclusions,
      ...feedbackExclusionCandidates,
    ]),
  ];

  const generatedFrom = [
    `hash:${currentHash}`,
    ...(inputs.topics.length > 0 ? ["parsedTopics"] : []),
    ...(inputs.initiatives.length > 0 ? ["parsedInitiatives"] : []),
    ...(inputs.concerns.length > 0 ? ["parsedConcerns"] : []),
    ...(inputs.expertAreas.length > 0 ? ["parsedExpertAreas"] : []),
    ...(inputs.rapidFireClassifications.length > 0 ? ["rapidFireClassifications"] : []),
    ...(feedbackExclusionCandidates.length > 0 ? ["feedbackSignals"] : []),
  ];

  const newVersion = existing ? existing.version + 1 : 1;

  const universe: ContentUniverse = {
    definition: parsed.definition,
    coreTopics: parsed.coreTopics,
    exclusions: mergedExclusions,
    seismicThreshold: parsed.seismicThreshold,
    generatedAt: new Date().toISOString(),
    generatedFrom,
    version: newVersion,
  };

  await db
    .update(userProfiles)
    .set({ contentUniverse: universe, updatedAt: new Date() })
    .where(eq(userProfiles.userId, userId));

  ulog.info({ version: newVersion, coreTopics: universe.coreTopics.length, exclusions: universe.exclusions.length }, "Content universe generated and saved");
  return universe;
}

export async function maybeRegenerateFromFeedback(userId: string): Promise<boolean> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile) return false;

  const existing = profile.contentUniverse as ContentUniverse | null;
  const sinceDate = existing?.generatedAt ? new Date(existing.generatedAt) : null;

  if (!sinceDate) return false;

  const exclusionCandidates = await collectFeedbackExclusions(userId, sinceDate);

  if (exclusionCandidates.length < 3) return false;

  log.info({ userId, exclusionCandidates: exclusionCandidates.length }, "Feedback threshold met — regenerating content universe");
  await generateContentUniverse(userId, exclusionCandidates);
  return true;
}
