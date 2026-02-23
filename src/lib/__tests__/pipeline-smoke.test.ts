/**
 * Pipeline smoke test — runs the full pipeline against real APIs and a real DB.
 *
 * Usage:
 *   npx vitest run src/lib/__tests__/pipeline-smoke.test.ts
 *
 * Requires: DATABASE_URL, OPENAI_API_KEY in .env.local
 * Optional: PERPLEXITY_API_KEY, TAVILY_API_KEY (tests degrade gracefully without them)
 *
 * This is NOT a unit test — it hits real APIs and real databases.
 * It's a smoke test to verify the pipeline runs end-to-end without crashing.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

import { db } from "../db";
import { users, userProfiles, briefings } from "../schema";
import { eq, desc, isNotNull } from "drizzle-orm";
import { toStringArray } from "../safe-parse";
import { runAiResearch } from "../ai-research";
import { runScoringAgent, DEFAULT_AGENT_CONFIG } from "../scoring-agent";
import { runPipeline } from "../pipeline";

let testUserId: string | null = null;

beforeAll(async () => {
  // Find a user with a populated profile (has parsed topics)
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
    // Fallback: any user
    const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
    testUserId = anyUser?.id ?? null;
  }
});

describe("Pipeline smoke test", () => {
  it("has a user to test with", () => {
    expect(testUserId).not.toBeNull();
    console.log(`Testing with user: ${testUserId}`);
  });

  it("user has a profile with content", async () => {
    if (!testUserId) return;
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, testUserId))
      .limit(1);
    expect(profile).toBeDefined();

    const topics = toStringArray(profile.parsedTopics);
    const initiatives = toStringArray(profile.parsedInitiatives);
    const concerns = toStringArray(profile.parsedConcerns);
    console.log("Profile:", {
      topics: topics.length,
      initiatives: initiatives.length,
      concerns: concerns.length,
      topicsSample: topics.slice(0, 3),
    });
    expect(topics.length).toBeGreaterThan(0);
  });

  it("ai-research produces signals", async () => {
    if (!testUserId) return;
    const signals = await runAiResearch(testUserId);
    console.log(`AI research produced ${signals.length} signals`);
    for (const s of signals.slice(0, 3)) {
      console.log(`  - [${s.sourceLabel}] ${s.title.slice(0, 80)}`);
    }
    if (process.env.PERPLEXITY_API_KEY || process.env.TAVILY_API_KEY) {
      expect(signals.length).toBeGreaterThan(0);
    }
  }, 60_000);

  it("scoring agent selects signals", async () => {
    if (!testUserId) return;

    // Minimal fake signals so we're not waiting on ingestion
    const fakeSignals = [
      { title: "Parametric insurance adoption surges in 2026", summary: "Major reinsurers adopting parametric models for climate risk.", sourceUrl: "https://example.com/1", sourceLabel: "Reuters" },
      { title: "New ESG reporting requirements announced", summary: "SEC mandates enhanced climate disclosure for public companies.", sourceUrl: "https://example.com/2", sourceLabel: "Bloomberg" },
      { title: "Arctic conservation breakthrough", summary: "New technology enables real-time monitoring of Arctic ice melt.", sourceUrl: "https://example.com/3", sourceLabel: "Nature" },
    ];

    const agentConfig = { ...DEFAULT_AGENT_CONFIG, maxToolRounds: 5, targetSelections: 2 };
    const result = await runScoringAgent(testUserId, fakeSignals, agentConfig);

    console.log("Scoring agent result:", {
      hasResult: !!result,
      selections: result?.selections.length ?? 0,
      toolCalls: result?.toolCallLog.length ?? 0,
      toolsUsed: result?.toolCallLog.map((t) => t.tool) ?? [],
      model: result?.modelUsed,
      promptTokens: result?.promptTokens ?? 0,
      completionTokens: result?.completionTokens ?? 0,
    });
    if (result?.selections) {
      for (const s of result.selections) {
        console.log(`  Selected [${s.signalIndex}]: ${s.reason} — ${s.reasonLabel}`);
      }
    }
    expect(result).not.toBeNull();
    expect(result!.selections.length).toBeGreaterThan(0);
  }, 120_000);

  it("full pipeline produces a briefing", async () => {
    if (!testUserId) return;
    const briefingId = await runPipeline(testUserId, {
      maxToolRounds: 5,
      targetSelections: 3,
    });
    console.log(`Pipeline result: briefingId=${briefingId}`);

    if (briefingId) {
      const [b] = await db
        .select()
        .from(briefings)
        .where(eq(briefings.id, briefingId))
        .limit(1);
      console.log("Briefing:", {
        items: (b?.items as unknown[])?.length ?? 0,
        model: b?.modelUsed,
        promptTokens: b?.promptTokens,
        completionTokens: b?.completionTokens,
      });
    }

    expect(briefingId).not.toBeNull();
    expect(typeof briefingId).toBe("string");
  }, 300_000);
});
