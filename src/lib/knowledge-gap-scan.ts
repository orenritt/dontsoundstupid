import { db } from "./db";
import {
  users,
  userProfiles,
  knowledgeEntities,
  newsQueries,
} from "./schema";
import { eq } from "drizzle-orm";
import { chat, embed } from "./llm";
import { toStringArray } from "./safe-parse";
import { contentHash } from "./news-ingestion/query-derivation";

interface GapItem {
  name: string;
  entityType: "concept" | "term" | "company" | "product" | "event";
  searchQuery: string;
  reason: string;
}

interface ScanResult {
  gapsFound: number;
  queriesAdded: number;
  entitiesSeeded: number;
}

export async function scanKnowledgeGaps(userId: string): Promise<ScanResult> {
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

  if (!user || !profile) {
    return { gapsFound: 0, queriesAdded: 0, entitiesSeeded: 0 };
  }

  const allEntities = await db
    .select({
      name: knowledgeEntities.name,
      entityType: knowledgeEntities.entityType,
      confidence: knowledgeEntities.confidence,
      source: knowledgeEntities.source,
    })
    .from(knowledgeEntities)
    .where(eq(knowledgeEntities.userId, userId));

  const grouped: Record<string, string[]> = {};
  for (const entity of allEntities) {
    const type = entity.entityType;
    if (!grouped[type]) grouped[type] = [];
    grouped[type]!.push(`${entity.name} (confidence: ${entity.confidence})`);
  }

  const knowledgeSnapshot = Object.entries(grouped)
    .map(([type, items]) => `## ${type}\n${items.join("\n")}`)
    .join("\n\n");

  const response = await chat(
    [
      {
        role: "system",
        content: `You are a strategic intelligence analyst. You will receive a professional's complete knowledge graph — everything they currently know about or track. Your job is to identify 10-15 GAPS: emerging concepts, companies, trends, regulatory shifts, technologies, or developments in their space that are NOT covered by their existing knowledge.

Focus on:
- New companies/startups that have emerged or gained prominence recently
- Emerging terminology, frameworks, or methodologies gaining traction
- Regulatory or policy developments that would affect their industry
- Technology shifts or platform changes relevant to their role
- Market trends or competitive dynamics not reflected in their graph
- Cross-industry trends that are starting to affect their domain

Do NOT suggest things they already know (check against the graph carefully).

Return ONLY a JSON array, no markdown. Each element:
{"name": "Item Name", "entityType": "concept|term|company|product|event", "searchQuery": "a search query that would surface news about this", "reason": "1 sentence on why this gap matters"}`,
      },
      {
        role: "user",
        content: `Professional: ${user.title || "Professional"} at ${user.company || "a company"}
Industry topics: ${toStringArray(profile.parsedTopics).join(", ")}
Initiatives: ${toStringArray(profile.parsedInitiatives).join(", ")}
Concerns: ${toStringArray(profile.parsedConcerns).join(", ")}
Knowledge gaps (self-reported): ${toStringArray(profile.parsedKnowledgeGaps).join(", ")}

Current knowledge graph (${allEntities.length} entities):
${knowledgeSnapshot}`,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.6, maxTokens: 2048 }
  );

  let gaps: GapItem[] = [];
  try {
    const cleaned = response.content
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    gaps = JSON.parse(cleaned);
    if (!Array.isArray(gaps)) return { gapsFound: 0, queriesAdded: 0, entitiesSeeded: 0 };
  } catch {
    console.error("Failed to parse knowledge gap scan response:", response.content);
    return { gapsFound: 0, queriesAdded: 0, entitiesSeeded: 0 };
  }

  const existingEntityNames = new Set(
    allEntities.map((e) => e.name.toLowerCase())
  );

  const existingQueries = await db
    .select({ contentHash: newsQueries.contentHash })
    .from(newsQueries)
    .where(eq(newsQueries.userId, userId));
  const existingHashes = new Set(existingQueries.map((q) => q.contentHash));

  let queriesAdded = 0;
  let entitiesSeeded = 0;
  const newEntityNames: string[] = [];

  for (const gap of gaps) {
    if (!gap.name || !gap.searchQuery) continue;
    if (existingEntityNames.has(gap.name.toLowerCase())) continue;

    // Add search query
    const hash = contentHash(gap.searchQuery);
    if (!existingHashes.has(hash)) {
      try {
        await db.insert(newsQueries).values({
          userId,
          queryText: gap.searchQuery,
          derivedFrom: "ai-refresh",
          profileReference: `gap-scan: ${gap.name}`,
          contentHash: hash,
          geographicFilters: [],
          active: true,
        });
        existingHashes.add(hash);
        queriesAdded++;
      } catch {
        // constraint violation
      }
    }

    newEntityNames.push(gap.name);
  }

  // Seed knowledge entities at low confidence (0.1) so signals about
  // these topics register as highly novel
  if (newEntityNames.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < newEntityNames.length; i += batchSize) {
      const batch = newEntityNames.slice(i, i + batchSize);
      const matchingGaps = gaps.filter((g) => batch.includes(g.name));

      let embeddings: number[][] = [];
      try {
        embeddings = await embed(batch);
      } catch {
        embeddings = batch.map(() => []);
      }

      for (let j = 0; j < matchingGaps.length; j++) {
        const gap = matchingGaps[j]!;
        const validTypes = new Set(["concept", "term", "company", "product", "event"]);
        const entityType = validTypes.has(gap.entityType) ? gap.entityType : "concept";

        try {
          await db
            .insert(knowledgeEntities)
            .values({
              userId,
              entityType: entityType as "concept" | "term" | "company" | "product" | "event",
              name: gap.name,
              description: gap.reason || "",
              source: "industry-scan",
              confidence: 0.1,
              embedding: embeddings[j] || null,
            })
            .onConflictDoNothing();
          entitiesSeeded++;
        } catch {
          // skip duplicates
        }
      }
    }
  }

  return { gapsFound: gaps.length, queriesAdded, entitiesSeeded };
}
