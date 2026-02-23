import { db } from "./db";
import {
  impressContacts,
  knowledgeEntities,
  knowledgeEdges,
  signals,
  signalProvenance,
  type DeepDiveData,
  type EnrichmentDepth,
} from "./schema";
import { eq, and } from "drizzle-orm";
import { searchPerplexity } from "./ai-research";
import { searchTavily } from "./ai-research";
import { chat, embed } from "./llm";
import {
  markPerplexityCalled,
  markTavilyCalled,
} from "./enrichment-queue";

export interface DeepDiveOptions {
  depth?: EnrichmentDepth;
  isReEnrichment?: boolean;
}

export interface EnrichmentDiff {
  companyChanged: { from: string; to: string } | null;
  roleChanged: { from: string; to: string } | null;
  focusAreasAdded: string[];
  focusAreasRemoved: string[];
  interestsAdded: string[];
  interestsRemoved: string[];
  isMaterial: boolean;
}

export async function runImpressDeepDive(
  contactId: string,
  userId: string,
  options: DeepDiveOptions = {}
): Promise<void> {
  const { depth = "full", isReEnrichment = false } = options;

  const [contact] = await db
    .select()
    .from(impressContacts)
    .where(
      and(eq(impressContacts.id, contactId), eq(impressContacts.userId, userId))
    )
    .limit(1);

  if (!contact || !contact.name) return;

  const previousData = isReEnrichment ? contact.deepDiveData : null;
  const previousTitle = contact.title;
  const previousCompany = contact.company;

  await db
    .update(impressContacts)
    .set({ researchStatus: "pending" })
    .where(eq(impressContacts.id, contactId));

  try {
    const deepDiveData = await researchContact(
      contact.name,
      contact.title || "",
      contact.company || "",
      depth
    );

    const newVersion = (contact.enrichmentVersion || 0) + 1;

    await db
      .update(impressContacts)
      .set({
        deepDiveData,
        researchStatus: "completed",
        lastEnrichedAt: new Date(),
        enrichmentVersion: newVersion,
        enrichmentDepth: depth,
      })
      .where(eq(impressContacts.id, contactId));

    const kgSource =
      depth === "light" ? "calendar-deep-dive" : "impress-deep-dive";
    const kgConfidence = depth === "light" ? 0.6 : 0.7;

    if (isReEnrichment && previousData) {
      const diff = computeEnrichmentDiff(
        previousData,
        deepDiveData,
        previousTitle || "",
        contact.title || "",
        previousCompany || "",
        contact.company || ""
      );

      await updateKnowledgeGraphOnReEnrichment(
        userId,
        contact.name,
        deepDiveData,
        previousData,
        diff
      );

      if (diff.isMaterial) {
        await emitContactChangeSignals(userId, contact.name, contactId, diff);
      }
    } else {
      await seedFromDeepDive(
        userId,
        contactId,
        contact.name,
        deepDiveData,
        kgSource,
        kgConfidence
      );
    }
  } catch (err) {
    console.error(`Deep dive failed for contact ${contactId}:`, err);
    await db
      .update(impressContacts)
      .set({ researchStatus: "failed" })
      .where(eq(impressContacts.id, contactId));
  }
}

async function researchContact(
  name: string,
  title: string,
  company: string,
  depth: EnrichmentDepth
): Promise<DeepDiveData> {
  const personDesc = [name, title, company].filter(Boolean).join(", ");

  if (depth === "none") {
    return {
      interests: [],
      focusAreas: [],
      recentActivity: [],
      talkingPoints: [],
      companyContext: "",
      summary: `No enrichment performed for ${personDesc}.`,
    };
  }

  const perplexityPromise = searchPerplexity(
    `Who is ${name}${title ? `, ${title}` : ""}${company ? ` at ${company}` : ""}? What are their professional focus areas, recent publications, public talks, and what topics do they care about? What should someone know before meeting them?`,
    "You are a professional intelligence researcher. Provide a thorough overview of this person's professional interests, expertise, and recent activity. Be factual and specific."
  ).then((r) => {
    markPerplexityCalled();
    return r;
  });

  let tavilyPersonPromise: Promise<Awaited<ReturnType<typeof searchTavily>> | null>;
  let tavilyCompanyPromise: Promise<Awaited<ReturnType<typeof searchTavily>> | null>;

  if (depth === "full") {
    tavilyPersonPromise = searchTavily(`"${name}" ${company || ""} recent news`, {
      topic: "news",
      timeRange: "month",
      maxResults: 5,
    }).then((r) => {
      markTavilyCalled();
      return r;
    });

    tavilyCompanyPromise = company
      ? searchTavily(`${company} announcements news`, {
          topic: "news",
          timeRange: "month",
          maxResults: 3,
        }).then((r) => {
          markTavilyCalled();
          return r;
        })
      : Promise.resolve(null);
  } else {
    tavilyPersonPromise = Promise.resolve(null);
    tavilyCompanyPromise = Promise.resolve(null);
  }

  const [perplexityResult, tavilyPersonResult, tavilyCompanyResult] =
    await Promise.all([
      perplexityPromise,
      tavilyPersonPromise,
      tavilyCompanyPromise,
    ]);

  const rawResearch: string[] = [];
  if (perplexityResult?.content) {
    rawResearch.push(`## Person Overview\n${perplexityResult.content}`);
  }
  if (tavilyPersonResult?.results.length) {
    const articles = tavilyPersonResult.results
      .map((r) => `- ${r.title}: ${r.content}`)
      .join("\n");
    rawResearch.push(`## Recent News About ${name}\n${articles}`);
  }
  if (tavilyCompanyResult?.results.length) {
    const articles = tavilyCompanyResult.results
      .map((r) => `- ${r.title}: ${r.content}`)
      .join("\n");
    rawResearch.push(`## Recent Company News (${company})\n${articles}`);
  }

  if (rawResearch.length === 0) {
    return {
      interests: [],
      focusAreas: [],
      recentActivity: [],
      talkingPoints: [],
      companyContext: "",
      summary: `Limited public information found for ${personDesc}.`,
    };
  }

  const structuringResponse = await chat(
    [
      {
        role: "system",
        content: `Extract structured intelligence from the research below about ${personDesc}. Return ONLY a JSON object with these fields:
- "interests": string[] — topics and themes they care about (5-10 items)
- "focusAreas": string[] — their professional focus areas (3-5 items)
- "recentActivity": string[] — recent talks, publications, initiatives, notable actions (3-5 items)
- "talkingPoints": string[] — conversation starters based on their work (3-5 items)
- "companyContext": string — what their company is doing lately (1-2 sentences)
- "summary": string — 2-3 sentence overview of who they are professionally

Be specific and factual. If information is sparse, return shorter arrays rather than inventing details.`,
      },
      {
        role: "user",
        content: rawResearch.join("\n\n"),
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.3, maxTokens: 1024 }
  );

  try {
    const cleaned = structuringResponse.content
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as DeepDiveData;
    return {
      interests: parsed.interests || [],
      focusAreas: parsed.focusAreas || [],
      recentActivity: parsed.recentActivity || [],
      talkingPoints: parsed.talkingPoints || [],
      companyContext: parsed.companyContext || "",
      summary: parsed.summary || `Professional at ${company || "unknown"}.`,
    };
  } catch {
    console.error(
      "Failed to parse deep dive structuring response:",
      structuringResponse.content
    );
    return {
      interests: [],
      focusAreas: [],
      recentActivity: [],
      talkingPoints: [],
      companyContext: "",
      summary: `Research collected for ${personDesc} but structuring failed.`,
    };
  }
}

// --- Diff detection (Tasks 5.1–5.2) ---

export function computeEnrichmentDiff(
  previous: DeepDiveData,
  current: DeepDiveData,
  previousTitle: string,
  currentTitle: string,
  previousCompany: string,
  currentCompany: string
): EnrichmentDiff {
  const companyChanged =
    previousCompany &&
    currentCompany &&
    normalizeStr(previousCompany) !== normalizeStr(currentCompany)
      ? { from: previousCompany, to: currentCompany }
      : null;

  const roleChanged =
    previousTitle &&
    currentTitle &&
    normalizeStr(previousTitle) !== normalizeStr(currentTitle) &&
    !companyChanged &&
    isSeniorityOrFunctionShift(previousTitle, currentTitle)
      ? { from: previousTitle, to: currentTitle }
      : null;

  const prevFocus = new Set(previous.focusAreas.map(normalizeStr));
  const currFocus = new Set(current.focusAreas.map(normalizeStr));
  const focusAreasAdded = current.focusAreas.filter(
    (f) => !prevFocus.has(normalizeStr(f))
  );
  const focusAreasRemoved = previous.focusAreas.filter(
    (f) => !currFocus.has(normalizeStr(f))
  );

  const prevInterests = new Set(previous.interests.map(normalizeStr));
  const currInterests = new Set(current.interests.map(normalizeStr));
  const interestsAdded = current.interests.filter(
    (i) => !prevInterests.has(normalizeStr(i))
  );
  const interestsRemoved = previous.interests.filter(
    (i) => !currInterests.has(normalizeStr(i))
  );

  const isMaterial =
    !!companyChanged ||
    !!roleChanged ||
    focusAreasAdded.length + focusAreasRemoved.length > 1 ||
    interestsAdded.length + interestsRemoved.length > 2;

  return {
    companyChanged,
    roleChanged,
    focusAreasAdded,
    focusAreasRemoved,
    interestsAdded,
    interestsRemoved,
    isMaterial,
  };
}

function normalizeStr(s: string): string {
  return s.toLowerCase().trim();
}

const SENIORITY_KEYWORDS = [
  "chief",
  "ceo",
  "cto",
  "cfo",
  "coo",
  "cmo",
  "vp",
  "vice president",
  "svp",
  "evp",
  "director",
  "head",
  "president",
  "partner",
  "principal",
  "fellow",
  "managing",
];

const FUNCTION_KEYWORDS = [
  "engineering",
  "product",
  "design",
  "marketing",
  "sales",
  "operations",
  "finance",
  "legal",
  "hr",
  "people",
  "data",
  "research",
  "strategy",
  "growth",
];

function isSeniorityOrFunctionShift(
  previousTitle: string,
  currentTitle: string
): boolean {
  const prevLower = previousTitle.toLowerCase();
  const currLower = currentTitle.toLowerCase();

  const prevSeniority = SENIORITY_KEYWORDS.filter((k) =>
    prevLower.includes(k)
  );
  const currSeniority = SENIORITY_KEYWORDS.filter((k) =>
    currLower.includes(k)
  );
  if (
    prevSeniority.length !== currSeniority.length ||
    prevSeniority.some((k, i) => k !== currSeniority[i])
  ) {
    return true;
  }

  const prevFunction = FUNCTION_KEYWORDS.filter((k) => prevLower.includes(k));
  const currFunction = FUNCTION_KEYWORDS.filter((k) => currLower.includes(k));
  if (
    prevFunction.length !== currFunction.length ||
    prevFunction.some((k, i) => k !== currFunction[i])
  ) {
    return true;
  }

  return false;
}

// --- Signal emission on material changes (Tasks 5.3–5.4) ---

async function emitContactChangeSignals(
  userId: string,
  contactName: string,
  contactId: string,
  diff: EnrichmentDiff
): Promise<void> {
  const changeDetails: { subtype: string; details: Record<string, string> }[] =
    [];

  if (diff.companyChanged) {
    changeDetails.push({
      subtype: "company-change",
      details: {
        person: contactName,
        previousCompany: diff.companyChanged.from,
        newCompany: diff.companyChanged.to,
        ...(diff.roleChanged
          ? {
              previousRole: diff.roleChanged.from,
              newRole: diff.roleChanged.to,
            }
          : {}),
      },
    });
  } else if (diff.roleChanged) {
    changeDetails.push({
      subtype: "role-change",
      details: {
        person: contactName,
        previousRole: diff.roleChanged.from,
        newRole: diff.roleChanged.to,
      },
    });
  }

  if (diff.focusAreasAdded.length + diff.focusAreasRemoved.length > 1) {
    changeDetails.push({
      subtype: "focus-shift",
      details: {
        person: contactName,
        added: diff.focusAreasAdded.join(", ") || "(none)",
        removed: diff.focusAreasRemoved.join(", ") || "(none)",
      },
    });
  }

  for (const change of changeDetails) {
    const title = buildSignalTitle(contactName, change.subtype);
    const content = buildSignalContent(contactName, change.subtype, change.details);
    const sourceUrl = `internal://contact-change/${contactId}/${change.subtype}/${Date.now()}`;

    try {
      const [signal] = await db
        .insert(signals)
        .values({
          layer: "personal-graph",
          sourceUrl,
          title,
          content,
          summary: title,
          metadata: { ...change.details, subtype: change.subtype },
          publishedAt: new Date(),
        })
        .returning();

      if (signal) {
        await db
          .insert(signalProvenance)
          .values({
            signalId: signal.id,
            userId,
            triggerReason: "personal-graph",
            profileReference: `impress-contact:${contactId}`,
          })
          .onConflictDoNothing();
      }
    } catch (err) {
      console.error(`Failed to emit ${change.subtype} signal:`, err);
    }
  }
}

function buildSignalTitle(name: string, subtype: string): string {
  switch (subtype) {
    case "company-change":
      return `${name} moved to a new company`;
    case "role-change":
      return `${name} has a new role`;
    case "focus-shift":
      return `${name}'s professional focus has shifted`;
    default:
      return `${name}: contact update detected`;
  }
}

function buildSignalContent(
  name: string,
  subtype: string,
  details: Record<string, string>
): string {
  switch (subtype) {
    case "company-change":
      return `${name} has moved from ${details.previousCompany} to ${details.newCompany}.${
        details.newRole ? ` New role: ${details.newRole}.` : ""
      }`;
    case "role-change":
      return `${name}'s role has changed from ${details.previousRole} to ${details.newRole}.`;
    case "focus-shift":
      return `${name}'s professional focus areas have shifted. New areas: ${details.added}. Previous areas no longer prominent: ${details.removed}.`;
    default:
      return `A change was detected for ${name}.`;
  }
}

// --- Knowledge graph seeding (original + re-enrichment) ---

async function seedFromDeepDive(
  userId: string,
  contactId: string,
  contactName: string,
  data: DeepDiveData,
  source: "impress-deep-dive" | "calendar-deep-dive" = "impress-deep-dive",
  confidence: number = 0.7
): Promise<void> {
  const conceptNames = [
    ...new Set(
      [...data.interests, ...data.focusAreas]
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];

  if (conceptNames.length === 0) return;

  const personEntityId = await ensurePersonEntity(
    userId,
    contactName,
    data.summary,
    source
  );
  if (!personEntityId) return;

  let embeddings: number[][] = [];
  try {
    embeddings = await embed(conceptNames);
  } catch {
    embeddings = conceptNames.map(() => []);
  }

  for (let i = 0; i < conceptNames.length; i++) {
    const name = conceptNames[i]!;
    const conceptEmbedding = embeddings[i] || null;
    const conceptEntityId = await ensureConceptEntity(
      userId,
      name,
      source,
      confidence,
      conceptEmbedding
    );
    if (!conceptEntityId) continue;

    try {
      await db
        .insert(knowledgeEdges)
        .values({
          sourceEntityId: personEntityId,
          targetEntityId: conceptEntityId,
          relationship: "cares-about",
        })
        .onConflictDoNothing();
    } catch {
      // edge may already exist
    }
  }
}

// --- Knowledge graph updates on re-enrichment (Tasks 6.1–6.4) ---

async function updateKnowledgeGraphOnReEnrichment(
  userId: string,
  contactName: string,
  newData: DeepDiveData,
  previousData: DeepDiveData,
  diff: EnrichmentDiff
): Promise<void> {
  const personEntityId = await ensurePersonEntity(
    userId,
    contactName,
    newData.summary,
    "impress-deep-dive"
  );
  if (!personEntityId) return;

  // Task 6.3: Update person description
  await db
    .update(knowledgeEntities)
    .set({
      description: newData.summary || "",
      lastReinforced: new Date(),
    })
    .where(eq(knowledgeEntities.id, personEntityId));

  // Task 6.1: Add new cares-about edges for new concepts
  const newConcepts = [
    ...new Set(
      [...newData.interests, ...newData.focusAreas]
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];

  const previousConcepts = new Set(
    [...previousData.interests, ...previousData.focusAreas]
      .map((s) => normalizeStr(s.trim()))
      .filter(Boolean)
  );

  const addedConcepts = newConcepts.filter(
    (c) => !previousConcepts.has(normalizeStr(c))
  );

  if (addedConcepts.length > 0) {
    let embeddings: number[][] = [];
    try {
      embeddings = await embed(addedConcepts);
    } catch {
      embeddings = addedConcepts.map(() => []);
    }

    for (let i = 0; i < addedConcepts.length; i++) {
      const name = addedConcepts[i]!;
      const conceptEntityId = await ensureConceptEntity(
        userId,
        name,
        "impress-deep-dive",
        0.7,
        embeddings[i] || null
      );
      if (!conceptEntityId) continue;

      try {
        await db
          .insert(knowledgeEdges)
          .values({
            sourceEntityId: personEntityId,
            targetEntityId: conceptEntityId,
            relationship: "cares-about",
          })
          .onConflictDoNothing();
      } catch {
        // edge may already exist
      }
    }
  }

  // Task 6.2: Reduce confidence on removed focus areas
  const currentConceptsNorm = new Set(newConcepts.map(normalizeStr));
  const removedConcepts = [
    ...previousData.interests,
    ...previousData.focusAreas,
  ].filter((c) => c.trim() && !currentConceptsNorm.has(normalizeStr(c)));

  for (const removedName of removedConcepts) {
    const [conceptEntity] = await db
      .select()
      .from(knowledgeEntities)
      .where(
        and(
          eq(knowledgeEntities.userId, userId),
          eq(knowledgeEntities.entityType, "concept"),
          eq(knowledgeEntities.name, removedName.trim())
        )
      )
      .limit(1);

    if (conceptEntity) {
      await db
        .update(knowledgeEntities)
        .set({ confidence: 0.3 })
        .where(eq(knowledgeEntities.id, conceptEntity.id));
    }
  }

  // Task 6.4: Handle company change in knowledge graph
  if (diff.companyChanged) {
    const newOrgId = await ensureOrgEntity(userId, diff.companyChanged.to);

    if (newOrgId) {
      await db
        .insert(knowledgeEdges)
        .values({
          sourceEntityId: personEntityId,
          targetEntityId: newOrgId,
          relationship: "works-at",
        })
        .onConflictDoNothing();
    }
  }
}

// --- Shared entity helpers ---

async function ensurePersonEntity(
  userId: string,
  name: string,
  description: string,
  source: "impress-deep-dive" | "calendar-deep-dive"
): Promise<string | undefined> {
  const [existing] = await db
    .select()
    .from(knowledgeEntities)
    .where(
      and(
        eq(knowledgeEntities.userId, userId),
        eq(knowledgeEntities.entityType, "person"),
        eq(knowledgeEntities.name, name)
      )
    )
    .limit(1);

  if (existing) {
    if (description) {
      await db
        .update(knowledgeEntities)
        .set({ description })
        .where(eq(knowledgeEntities.id, existing.id));
    }
    return existing.id;
  }

  let personEmbedding: number[] | null = null;
  try {
    const [emb] = await embed([name]);
    personEmbedding = emb ?? null;
  } catch {
    // embedding optional
  }

  const [created] = await db
    .insert(knowledgeEntities)
    .values({
      userId,
      entityType: "person",
      name,
      description: description || "",
      source,
      confidence: 1.0,
      embedding: personEmbedding,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created.id;

  const [refetch] = await db
    .select()
    .from(knowledgeEntities)
    .where(
      and(
        eq(knowledgeEntities.userId, userId),
        eq(knowledgeEntities.entityType, "person"),
        eq(knowledgeEntities.name, name)
      )
    )
    .limit(1);

  return refetch?.id;
}

async function ensureConceptEntity(
  userId: string,
  name: string,
  source: "impress-deep-dive" | "calendar-deep-dive",
  confidence: number,
  embedding: number[] | null
): Promise<string | undefined> {
  const [existing] = await db
    .select()
    .from(knowledgeEntities)
    .where(
      and(
        eq(knowledgeEntities.userId, userId),
        eq(knowledgeEntities.entityType, "concept"),
        eq(knowledgeEntities.name, name)
      )
    )
    .limit(1);

  if (existing) return existing.id;

  try {
    const [created] = await db
      .insert(knowledgeEntities)
      .values({
        userId,
        entityType: "concept",
        name,
        source,
        confidence,
        embedding,
      })
      .onConflictDoNothing()
      .returning();

    if (created) return created.id;

    const [refetch] = await db
      .select()
      .from(knowledgeEntities)
      .where(
        and(
          eq(knowledgeEntities.userId, userId),
          eq(knowledgeEntities.entityType, "concept"),
          eq(knowledgeEntities.name, name)
        )
      )
      .limit(1);

    return refetch?.id;
  } catch {
    return undefined;
  }
}

async function ensureOrgEntity(
  userId: string,
  companyName: string
): Promise<string | undefined> {
  const [existing] = await db
    .select()
    .from(knowledgeEntities)
    .where(
      and(
        eq(knowledgeEntities.userId, userId),
        eq(knowledgeEntities.entityType, "company"),
        eq(knowledgeEntities.name, companyName)
      )
    )
    .limit(1);

  if (existing) return existing.id;

  let orgEmbedding: number[] | null = null;
  try {
    const [emb] = await embed([companyName]);
    orgEmbedding = emb ?? null;
  } catch {
    // embedding optional
  }

  try {
    const [created] = await db
      .insert(knowledgeEntities)
      .values({
        userId,
        entityType: "company",
        name: companyName,
        source: "impress-deep-dive",
        confidence: 0.8,
        embedding: orgEmbedding,
      })
      .onConflictDoNothing()
      .returning();

    if (created) return created.id;

    const [refetch] = await db
      .select()
      .from(knowledgeEntities)
      .where(
        and(
          eq(knowledgeEntities.userId, userId),
          eq(knowledgeEntities.entityType, "company"),
          eq(knowledgeEntities.name, companyName)
        )
      )
      .limit(1);

    return refetch?.id;
  } catch {
    return undefined;
  }
}
