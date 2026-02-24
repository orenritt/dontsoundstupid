import { db } from "./db";
import { knowledgeEntities } from "./schema";
import { chat, embed } from "./llm";
import { isEntitySuppressed } from "./knowledge-prune";

interface BriefingItem {
  id: string;
  topic: string;
  content: string;
  sourceUrl: string | null;
}

interface ExtractedEntity {
  name: string;
  entityType: "company" | "person" | "concept" | "term" | "product" | "event" | "fact";
}

export async function extractAndSeedEntities(
  userId: string,
  items: BriefingItem[]
): Promise<number> {
  if (items.length === 0) return 0;

  const itemSummaries = items
    .map((item) => `Topic: ${item.topic}\n${item.content}`)
    .join("\n\n---\n\n");

  const response = await chat(
    [
      {
        role: "system",
        content: `Extract key entities from briefing items. For each item, identify the companies, people, concepts, terms, products, and events mentioned. Return ONLY a JSON array, no markdown. Each element:
{"name": "Entity Name", "entityType": "company|person|concept|term|product|event|fact"}

Rules:
- Extract 2-4 entities per briefing item
- Use the most specific entity type that applies
- Normalize names (e.g., "Google" not "google" or "Alphabet/Google")
- Skip generic terms (e.g., "market", "growth", "technology")
- Include the main subject of each item`,
      },
      {
        role: "user",
        content: itemSummaries,
      },
    ],
    { model: "gpt-4o-mini", temperature: 0.1, maxTokens: 1024 }
  );

  let entities: ExtractedEntity[] = [];
  try {
    const cleaned = response.content
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    entities = JSON.parse(cleaned);
    if (!Array.isArray(entities)) return 0;
  } catch {
    console.error("Failed to parse entity extraction response:", response.content);
    return 0;
  }

  const validTypes = new Set([
    "company", "person", "concept", "term", "product", "event", "fact",
  ]);
  const unique = new Map<string, ExtractedEntity>();
  for (const entity of entities) {
    if (!entity.name || !validTypes.has(entity.entityType)) continue;
    const key = entity.name.toLowerCase();
    if (!unique.has(key)) unique.set(key, entity);
  }

  const deduped = [...unique.values()];
  if (deduped.length === 0) return 0;

  let embeddings: number[][] = [];
  try {
    embeddings = await embed(deduped.map((e) => e.name));
  } catch {
    embeddings = deduped.map(() => []);
  }

  let seeded = 0;
  for (let i = 0; i < deduped.length; i++) {
    const entity = deduped[i]!;
    try {
      const suppressed = await isEntitySuppressed(userId, entity.name, entity.entityType);
      if (suppressed) continue;

      await db
        .insert(knowledgeEntities)
        .values({
          userId,
          entityType: entity.entityType,
          name: entity.name,
          source: "briefing-delivered",
          confidence: 0.9,
          embedding: embeddings[i] || null,
        })
        .onConflictDoNothing();
      seeded++;
    } catch {
      // duplicate or constraint violation
    }
  }

  return seeded;
}
