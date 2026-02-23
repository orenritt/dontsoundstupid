import { db } from "./db";
import {
  impressContacts,
  knowledgeEntities,
  knowledgeEdges,
  type DeepDiveData,
} from "./schema";
import { eq, and } from "drizzle-orm";
import { searchPerplexity } from "./ai-research";
import { searchTavily } from "./ai-research";
import { chat, embed } from "./llm";

export async function runImpressDeepDive(
  contactId: string,
  userId: string
): Promise<void> {
  const [contact] = await db
    .select()
    .from(impressContacts)
    .where(
      and(eq(impressContacts.id, contactId), eq(impressContacts.userId, userId))
    )
    .limit(1);

  if (!contact || !contact.name) return;

  await db
    .update(impressContacts)
    .set({ researchStatus: "pending" })
    .where(eq(impressContacts.id, contactId));

  try {
    const deepDiveData = await researchContact(
      contact.name,
      contact.title || "",
      contact.company || ""
    );

    await db
      .update(impressContacts)
      .set({ deepDiveData, researchStatus: "completed" })
      .where(eq(impressContacts.id, contactId));

    await seedFromDeepDive(userId, contactId, contact.name, deepDiveData);
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
  company: string
): Promise<DeepDiveData> {
  const personDesc = [name, title, company].filter(Boolean).join(", ");

  const [perplexityResult, tavilyPersonResult, tavilyCompanyResult] =
    await Promise.all([
      searchPerplexity(
        `Who is ${name}${title ? `, ${title}` : ""}${company ? ` at ${company}` : ""}? What are their professional focus areas, recent publications, public talks, and what topics do they care about? What should someone know before meeting them?`,
        "You are a professional intelligence researcher. Provide a thorough overview of this person's professional interests, expertise, and recent activity. Be factual and specific."
      ),
      searchTavily(`"${name}" ${company || ""} recent news`, {
        topic: "news",
        timeRange: "month",
        maxResults: 5,
      }),
      company
        ? searchTavily(`${company} announcements news`, {
            topic: "news",
            timeRange: "month",
            maxResults: 3,
          })
        : Promise.resolve(null),
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

async function seedFromDeepDive(
  userId: string,
  contactId: string,
  contactName: string,
  data: DeepDiveData
): Promise<void> {
  const conceptNames = [
    ...new Set([...data.interests, ...data.focusAreas].map((s) => s.trim()).filter(Boolean)),
  ];

  if (conceptNames.length === 0) return;

  const [personEntity] = await db
    .select()
    .from(knowledgeEntities)
    .where(
      and(
        eq(knowledgeEntities.userId, userId),
        eq(knowledgeEntities.entityType, "person"),
        eq(knowledgeEntities.name, contactName)
      )
    )
    .limit(1);

  let personEntityId = personEntity?.id;

  if (personEntity && data.summary) {
    await db
      .update(knowledgeEntities)
      .set({ description: data.summary })
      .where(eq(knowledgeEntities.id, personEntity.id));
  }

  if (!personEntityId) {
    let personEmbedding: number[] | null = null;
    try {
      const [emb] = await embed([contactName]);
      personEmbedding = emb ?? null;
    } catch {
      // embedding optional
    }
    const [newPerson] = await db
      .insert(knowledgeEntities)
      .values({
        userId,
        entityType: "person",
        name: contactName,
        description: data.summary || "",
        source: "impress-deep-dive",
        confidence: 1.0,
        embedding: personEmbedding,
      })
      .onConflictDoNothing()
      .returning();
    personEntityId = newPerson?.id;

    if (!personEntityId) {
      const [existing] = await db
        .select()
        .from(knowledgeEntities)
        .where(
          and(
            eq(knowledgeEntities.userId, userId),
            eq(knowledgeEntities.entityType, "person"),
            eq(knowledgeEntities.name, contactName)
          )
        )
        .limit(1);
      personEntityId = existing?.id;
    }
  }

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

    let conceptEntityId: string | undefined;

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

    if (existing) {
      conceptEntityId = existing.id;
    } else {
      try {
        const [created] = await db
          .insert(knowledgeEntities)
          .values({
            userId,
            entityType: "concept",
            name,
            source: "impress-deep-dive",
            confidence: 0.7,
            embedding: conceptEmbedding,
          })
          .onConflictDoNothing()
          .returning();
        conceptEntityId = created?.id;

        if (!conceptEntityId) {
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
          conceptEntityId = refetch?.id;
        }
      } catch {
        continue;
      }
    }

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
