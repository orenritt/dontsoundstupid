import { db } from "./db";
import {
  users,
  userProfiles,
  impressContacts,
  peerOrganizations,
  knowledgeEntities,
} from "./schema";
import { eq } from "drizzle-orm";
import { chat, embed } from "./llm";
import { toStringArray } from "./safe-parse";
import { isEntitySuppressed, pruneKnowledgeGraph } from "./knowledge-prune";

export async function seedKnowledgeGraph(userId: string) {
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

  if (!user || !profile) return;

  const contacts = await db
    .select()
    .from(impressContacts)
    .where(eq(impressContacts.userId, userId));
  const peers = await db
    .select()
    .from(peerOrganizations)
    .where(eq(peerOrganizations.userId, userId));

  const entities: { name: string; type: string; source: string; confidence: number }[] = [];

  // Phase 1: Profile-derived entities (confidence 1.0)
  if (user.company) {
    entities.push({ name: user.company, type: "company", source: "profile-derived", confidence: 1.0 });
  }
  for (const peer of peers.filter((p) => p.confirmed)) {
    entities.push({ name: peer.name, type: "company", source: "profile-derived", confidence: 1.0 });
  }
  for (const contact of contacts) {
    if (contact.name) {
      entities.push({ name: contact.name, type: "person", source: "profile-derived", confidence: 1.0 });
    }
  }
  for (const topic of toStringArray(profile.parsedTopics)) {
    entities.push({ name: topic, type: "concept", source: "profile-derived", confidence: 1.0 });
  }
  for (const area of toStringArray(profile.parsedExpertAreas)) {
    entities.push({ name: area, type: "concept", source: "profile-derived", confidence: 1.0 });
  }

  // Rapid-fire "know-tons" entities
  const classifications = (profile.rapidFireClassifications as { topic: string; response: string }[]) || [];
  for (const c of classifications) {
    if (c.response === "know-tons") {
      entities.push({ name: c.topic, type: "concept", source: "rapid-fire", confidence: 1.0 });
    } else if (c.response === "need-more") {
      entities.push({ name: c.topic, type: "concept", source: "rapid-fire", confidence: 0.3 });
    }
  }

  // Phase 2: AI industry scan (confidence 0.8)
  try {
    const scanResponse = await chat([
      {
        role: "system",
        content: "Return a JSON array of strings. Each string is a concept, term, company, product, or fact that a professional in this role would be expected to already know. Return 30-50 items.",
      },
      {
        role: "user",
        content: `Role: ${user.title || "Professional"} at ${user.company || "their company"}. Topics they work on: ${toStringArray(profile.parsedTopics).join(", ")}`,
      },
    ], { model: "gpt-4o-mini", temperature: 0.5 });

    const scanned = JSON.parse(scanResponse.content) as string[];
    for (const item of scanned) {
      entities.push({ name: item, type: "concept", source: "industry-scan", confidence: 0.8 });
    }
  } catch (e) {
    console.error("Industry scan failed:", e);
  }

  // Deduplicate by name
  const seen = new Set<string>();
  const unique = entities.filter((e) => {
    const key = e.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Generate embeddings in batches
  const batchSize = 50;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    let embeddings: number[][] = [];
    try {
      embeddings = await embed(batch.map((e) => e.name));
    } catch {
      embeddings = batch.map(() => []);
    }

    for (let j = 0; j < batch.length; j++) {
      const entity = batch[j]!;
      try {
        const suppressed = await isEntitySuppressed(userId, entity.name, entity.type);
        if (suppressed) continue;

        await db
          .insert(knowledgeEntities)
          .values({
            userId,
            entityType: entity.type as "company" | "person" | "concept" | "term" | "product" | "event" | "fact",
            name: entity.name,
            source: entity.source as "profile-derived" | "industry-scan" | "rapid-fire",
            confidence: entity.confidence,
            embedding: embeddings[j] || null,
          })
          .onConflictDoNothing();
      } catch {
        // Skip duplicates
      }
    }
  }

  await pruneKnowledgeGraph(userId);
}
