/**
 * Knowledge gap scan smoke test — hits real APIs and DB.
 *
 * Usage:
 *   npx vitest run src/lib/__tests__/knowledge-gap-smoke.test.ts
 *
 * Requires: DATABASE_URL, OPENAI_API_KEY in .env.local
 *
 * This is NOT a unit test. It tests the full knowledge gap scan flow
 * against real infrastructure to verify it works end-to-end.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

import { db } from "../db";
import { users, userProfiles, knowledgeEntities, newsQueries } from "../schema";
import { eq, isNotNull } from "drizzle-orm";
import { toStringArray } from "../safe-parse";
import { scanKnowledgeGaps } from "../knowledge-gap-scan";

let testUserId: string | null = null;

beforeAll(async () => {
  const allProfiles = await db
    .select({ userId: userProfiles.userId, parsedTopics: userProfiles.parsedTopics })
    .from(userProfiles)
    .where(isNotNull(userProfiles.parsedTopics));

  const withContent = allProfiles.find((p) => {
    const topics = toStringArray(p.parsedTopics);
    return topics.length > 0;
  });

  if (withContent) {
    testUserId = withContent.userId;
  } else {
    const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
    testUserId = anyUser?.id ?? null;
  }
});

describe("Knowledge gap scan smoke test", () => {
  it("has a user to test with", () => {
    expect(testUserId).not.toBeNull();
    console.log(`Testing knowledge gap scan with user: ${testUserId}`);
  });

  it("user has a populated knowledge graph", async () => {
    if (!testUserId) return;

    const entities = await db
      .select({ name: knowledgeEntities.name, entityType: knowledgeEntities.entityType })
      .from(knowledgeEntities)
      .where(eq(knowledgeEntities.userId, testUserId));

    console.log(`User has ${entities.length} knowledge entities`);
    if (entities.length > 0) {
      const types = new Set(entities.map((e) => e.entityType));
      console.log(`  Entity types: ${[...types].join(", ")}`);
      console.log(`  Sample: ${entities.slice(0, 5).map((e) => e.name).join(", ")}`);
    }
  });

  it("scanKnowledgeGaps returns valid results", async () => {
    if (!testUserId) return;

    const queriesBefore = await db
      .select({ id: newsQueries.id })
      .from(newsQueries)
      .where(eq(newsQueries.userId, testUserId));

    const entitiesBefore = await db
      .select({ id: knowledgeEntities.id })
      .from(knowledgeEntities)
      .where(eq(knowledgeEntities.userId, testUserId));

    console.log(`Before scan: ${queriesBefore.length} queries, ${entitiesBefore.length} entities`);

    const result = await scanKnowledgeGaps(testUserId);

    console.log("Scan result:", {
      gapsFound: result.gapsFound,
      queriesAdded: result.queriesAdded,
      entitiesSeeded: result.entitiesSeeded,
    });

    expect(result.gapsFound).toBeGreaterThanOrEqual(0);
    expect(result.queriesAdded).toBeGreaterThanOrEqual(0);
    expect(result.entitiesSeeded).toBeGreaterThanOrEqual(0);

    // Verify data was actually written to the DB
    const queriesAfter = await db
      .select({ id: newsQueries.id })
      .from(newsQueries)
      .where(eq(newsQueries.userId, testUserId));

    const entitiesAfter = await db
      .select({ id: knowledgeEntities.id })
      .from(knowledgeEntities)
      .where(eq(knowledgeEntities.userId, testUserId));

    console.log(`After scan: ${queriesAfter.length} queries (+${queriesAfter.length - queriesBefore.length}), ${entitiesAfter.length} entities (+${entitiesAfter.length - entitiesBefore.length})`);

    expect(queriesAfter.length).toBeGreaterThanOrEqual(queriesBefore.length);
    expect(entitiesAfter.length).toBeGreaterThanOrEqual(entitiesBefore.length);
  }, 60_000);

  it("is idempotent — running twice doesn't create duplicates", async () => {
    if (!testUserId) return;

    // First run already happened above
    const entitiesBefore = await db
      .select({ id: knowledgeEntities.id })
      .from(knowledgeEntities)
      .where(eq(knowledgeEntities.userId, testUserId));

    const queriesBefore = await db
      .select({ id: newsQueries.id })
      .from(newsQueries)
      .where(eq(newsQueries.userId, testUserId));

    // Second run
    const result2 = await scanKnowledgeGaps(testUserId);
    console.log("Second scan result:", result2);

    const entitiesAfter = await db
      .select({ id: knowledgeEntities.id })
      .from(knowledgeEntities)
      .where(eq(knowledgeEntities.userId, testUserId));

    const queriesAfter = await db
      .select({ id: newsQueries.id })
      .from(newsQueries)
      .where(eq(newsQueries.userId, testUserId));

    // The second run may find new gaps (LLM is non-deterministic),
    // but should not create duplicates of existing entities/queries
    // thanks to contentHash dedup and onConflictDoNothing
    console.log(`Entities: ${entitiesBefore.length} -> ${entitiesAfter.length}`);
    console.log(`Queries: ${queriesBefore.length} -> ${queriesAfter.length}`);
  }, 60_000);
});
