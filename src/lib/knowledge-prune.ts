import { db } from "./db";
import {
  users,
  userProfiles,
  knowledgeEntities,
  knowledgeEdges,
  prunedEntities,
} from "./schema";
import { eq, and, or, notInArray } from "drizzle-orm";
import { chat } from "./llm";
import { toStringArray } from "./safe-parse";
import { createLogger } from "./logger";
import type { PruneResult } from "../models/knowledge-graph";
import type { KnowledgeEntityType } from "../models/knowledge-graph";

const log = createLogger("knowledge-prune");

const EXEMPT_SOURCES = ["profile-derived", "rapid-fire"] as const;
const BATCH_SIZE = 50;

interface EntityForPruning {
  id: string;
  name: string;
  entityType: string;
  description: string;
  source: string;
  confidence: number;
}

interface PruneVerdict {
  name: string;
  keep: boolean;
  reason: string;
}

export async function isEntitySuppressed(
  userId: string,
  name: string,
  entityType: string
): Promise<boolean> {
  const [match] = await db
    .select({ id: prunedEntities.id })
    .from(prunedEntities)
    .where(
      and(
        eq(prunedEntities.userId, userId),
        eq(prunedEntities.name, name),
        eq(
          prunedEntities.entityType,
          entityType as "company" | "person" | "concept" | "term" | "product" | "event" | "fact"
        )
      )
    )
    .limit(1);

  return !!match;
}

export async function pruneKnowledgeGraph(
  userId: string
): Promise<PruneResult> {
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
    return { pruned: 0, kept: 0, exempt: 0 };
  }

  const allEntities = await db
    .select({
      id: knowledgeEntities.id,
      name: knowledgeEntities.name,
      entityType: knowledgeEntities.entityType,
      description: knowledgeEntities.description,
      source: knowledgeEntities.source,
      confidence: knowledgeEntities.confidence,
    })
    .from(knowledgeEntities)
    .where(eq(knowledgeEntities.userId, userId));

  const exempt = allEntities.filter((e) =>
    (EXEMPT_SOURCES as readonly string[]).includes(e.source)
  );
  const prunable = allEntities.filter(
    (e) => !(EXEMPT_SOURCES as readonly string[]).includes(e.source)
  );

  if (prunable.length === 0) {
    return { pruned: 0, kept: 0, exempt: exempt.length };
  }

  const userContext = buildUserContext(user, profile);

  let totalPruned = 0;
  let totalKept = 0;

  for (let i = 0; i < prunable.length; i += BATCH_SIZE) {
    const batch = prunable.slice(i, i + BATCH_SIZE);
    const verdicts = await evaluateBatch(userContext, batch);

    for (const entity of batch) {
      const verdict = verdicts.find(
        (v) => v.name.toLowerCase() === entity.name.toLowerCase()
      );

      if (verdict && !verdict.keep) {
        await deleteAndSuppressEntity(userId, entity, verdict.reason);
        totalPruned++;
      } else {
        totalKept++;
      }
    }
  }

  log.info(
    { userId, pruned: totalPruned, kept: totalKept, exempt: exempt.length },
    "Knowledge graph pruning complete"
  );

  return { pruned: totalPruned, kept: totalKept, exempt: exempt.length };
}

function buildUserContext(
  user: { title: string | null; company: string | null },
  profile: { parsedTopics: unknown; parsedExpertAreas: unknown }
): string {
  const parts: string[] = [];
  if (user.title) parts.push(`Role: ${user.title}`);
  if (user.company) parts.push(`Company: ${user.company}`);
  const topics = toStringArray(profile.parsedTopics);
  if (topics.length > 0) parts.push(`Topics: ${topics.join(", ")}`);
  const expertAreas = toStringArray(profile.parsedExpertAreas);
  if (expertAreas.length > 0) parts.push(`Expert areas: ${expertAreas.join(", ")}`);
  return parts.join("\n");
}

async function evaluateBatch(
  userContext: string,
  entities: EntityForPruning[]
): Promise<PruneVerdict[]> {
  const entityList = entities
    .map(
      (e) =>
        `- "${e.name}" (type: ${e.entityType}, confidence: ${e.confidence})`
    )
    .join("\n");

  try {
    const response = await chat(
      [
        {
          role: "system",
          content: `You are evaluating a knowledge graph for quality. For each entity, decide whether to KEEP or PRUNE it based on two criteria:

1. NOT TOO GENERAL: Would a random professional in any industry also know this? If yes, it's too general — prune it. Examples of too-general: "Machine Learning", "Cloud Computing", "Data Analytics", "Agile", "User Experience", "Digital Transformation".

2. PLAUSIBLY RELATED: Could this entity surface in a signal/news item that would genuinely matter to this specific user? If no, it's drifting from their domain — prune it.

When in doubt, KEEP the entity.

Return ONLY a JSON array, no markdown. Each element: {"name": "Entity Name", "keep": true/false, "reason": "1 sentence"}`,
        },
        {
          role: "user",
          content: `USER CONTEXT:
${userContext}

ENTITIES TO EVALUATE:
${entityList}`,
        },
      ],
      { model: "gpt-4o-mini", temperature: 0.1, maxTokens: 2048 }
    );

    const cleaned = response.content
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as PruneVerdict[];
    if (!Array.isArray(parsed)) return entities.map((e) => ({ name: e.name, keep: true, reason: "Parse error fallback" }));
    return parsed;
  } catch (err) {
    log.error({ err, batchSize: entities.length }, "Litmus test batch failed — keeping all entities");
    return entities.map((e) => ({
      name: e.name,
      keep: true,
      reason: "Evaluation failed — defaulting to keep",
    }));
  }
}

async function deleteAndSuppressEntity(
  userId: string,
  entity: EntityForPruning,
  reason: string
): Promise<void> {
  await db
    .delete(knowledgeEdges)
    .where(
      or(
        eq(knowledgeEdges.sourceEntityId, entity.id),
        eq(knowledgeEdges.targetEntityId, entity.id)
      )
    );

  await db
    .delete(knowledgeEntities)
    .where(eq(knowledgeEntities.id, entity.id));

  try {
    await db
      .insert(prunedEntities)
      .values({
        userId,
        name: entity.name,
        entityType: entity.entityType as "company" | "person" | "concept" | "term" | "product" | "event" | "fact",
        reason,
      })
      .onConflictDoNothing();
  } catch {
    // already suppressed
  }
}
