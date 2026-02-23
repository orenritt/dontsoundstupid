import { test, expect } from "@playwright/test";

/**
 * Cron job E2E tests.
 *
 * These tests hit the real cron API endpoints (no browser UI needed).
 * Because each cron endpoint runs the full pipeline (ingestion, LLM calls,
 * composition, delivery) for every user in the database, they are slow
 * (5+ minutes per endpoint) and should only run against a staging
 * environment or with explicit opt-in.
 *
 * Usage:
 *   $env:E2E_LIVE_CRONS="1"; $env:CRON_SECRET="your-secret"; npx playwright test e2e/cron-jobs.spec.ts
 *
 * All tests are skipped unless E2E_LIVE_CRONS=1 is set.
 */

const CRON_SECRET = process.env.CRON_SECRET || "";
const LIVE = !!process.env.E2E_LIVE_CRONS;

test.describe("Cron job API endpoints", () => {
  test.setTimeout(600_000);

  test.describe("Authentication", () => {
    test("rejects requests without auth when CRON_SECRET is set", async ({
      request,
    }) => {
      test.skip(!LIVE || !CRON_SECRET, "Set E2E_LIVE_CRONS=1 and CRON_SECRET to run");

      const endpoints = [
        "/api/cron/daily",
        "/api/cron/ingest",
        "/api/cron/discover-feeds",
        "/api/cron/knowledge-gaps",
      ];

      for (const endpoint of endpoints) {
        const res = await request.get(endpoint);
        expect(res.status()).toBe(401);

        const resWithWrongSecret = await request.get(endpoint, {
          headers: { authorization: "Bearer wrong-secret" },
        });
        expect(resWithWrongSecret.status()).toBe(401);
      }
    });

    test("accepts requests with correct CRON_SECRET", async ({ request }) => {
      test.skip(!LIVE || !CRON_SECRET, "Set E2E_LIVE_CRONS=1 and CRON_SECRET to run");

      const res = await request.get("/api/cron/daily", {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      expect(res.status()).toBe(200);
    });
  });

  test.describe("Daily briefing cron", () => {
    test("returns valid summary shape", async ({ request }) => {
      test.skip(!LIVE, "Set E2E_LIVE_CRONS=1 to run cron E2E tests");

      const res = await request.get("/api/cron/daily", {
        headers: CRON_SECRET
          ? { authorization: `Bearer ${CRON_SECRET}` }
          : {},
      });

      expect(res.status()).toBe(200);
      const body = await res.json();

      expect(body).toHaveProperty("summary");
      expect(body.summary).toHaveProperty("total");
      expect(body.summary).toHaveProperty("success");
      expect(body.summary).toHaveProperty("skipped");
      expect(body.summary).toHaveProperty("errors");
      expect(body.summary).toHaveProperty("noContent");
      expect(typeof body.summary.total).toBe("number");
      expect(body).toHaveProperty("results");
      expect(Array.isArray(body.results)).toBe(true);

      for (const result of body.results) {
        expect(result).toHaveProperty("userId");
        expect(result).toHaveProperty("status");
        expect(["success", "skipped", "error", "no_content"]).toContain(
          result.status
        );
      }
    });
  });

  test.describe("Ingestion cron", () => {
    test("returns valid summary shape", async ({ request }) => {
      test.skip(!LIVE, "Set E2E_LIVE_CRONS=1 to run cron E2E tests");

      const res = await request.get("/api/cron/ingest", {
        headers: CRON_SECRET
          ? { authorization: `Bearer ${CRON_SECRET}` }
          : {},
      });

      expect(res.status()).toBe(200);
      const body = await res.json();

      expect(body).toHaveProperty("summary");
      expect(body.summary).toHaveProperty("usersProcessed");
      expect(body.summary).toHaveProperty("totalNewsSignals");
      expect(body.summary).toHaveProperty("totalSyndicationSignals");
      expect(body.summary).toHaveProperty("totalAiSignals");
      expect(body.summary).toHaveProperty("usersWithErrors");
      expect(body).toHaveProperty("results");
      expect(Array.isArray(body.results)).toBe(true);

      for (const result of body.results) {
        expect(result).toHaveProperty("userId");
        expect(result).toHaveProperty("newsSignals");
        expect(result).toHaveProperty("syndicationSignals");
        expect(result).toHaveProperty("aiSignals");
        expect(result).toHaveProperty("errors");
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });
  });

  test.describe("Feed discovery cron", () => {
    test("returns valid summary shape", async ({ request }) => {
      test.skip(!LIVE, "Set E2E_LIVE_CRONS=1 to run cron E2E tests");

      const res = await request.get("/api/cron/discover-feeds", {
        headers: CRON_SECRET
          ? { authorization: `Bearer ${CRON_SECRET}` }
          : {},
      });

      expect(res.status()).toBe(200);
      const body = await res.json();

      expect(body).toHaveProperty("summary");
      expect(body.summary).toHaveProperty("usersProcessed");
      expect(body.summary).toHaveProperty("totalFeedsDiscovered");
      expect(body.summary).toHaveProperty("totalSourcesAttempted");
      expect(body).toHaveProperty("results");
      expect(Array.isArray(body.results)).toBe(true);

      for (const result of body.results) {
        expect(result).toHaveProperty("userId");
        expect(result).toHaveProperty("feedsDiscovered");
        expect(result).toHaveProperty("sourcesAttempted");
      }
    });
  });

  test.describe("Knowledge gaps cron (biweekly)", () => {
    test("returns valid summary shape", async ({ request }) => {
      test.skip(!LIVE, "Set E2E_LIVE_CRONS=1 to run cron E2E tests");

      const res = await request.get("/api/cron/knowledge-gaps", {
        headers: CRON_SECRET
          ? { authorization: `Bearer ${CRON_SECRET}` }
          : {},
      });

      expect(res.status()).toBe(200);
      const body = await res.json();

      expect(body).toHaveProperty("summary");
      expect(body.summary).toHaveProperty("usersProcessed");
      expect(body.summary).toHaveProperty("totalGapsFound");
      expect(body.summary).toHaveProperty("totalQueriesAdded");
      expect(body.summary).toHaveProperty("totalEntitiesSeeded");
      expect(body.summary).toHaveProperty("errors");
      expect(body).toHaveProperty("results");
      expect(Array.isArray(body.results)).toBe(true);

      for (const result of body.results) {
        expect(result).toHaveProperty("userId");
        expect(result).toHaveProperty("gapsFound");
        expect(result).toHaveProperty("queriesAdded");
        expect(result).toHaveProperty("entitiesSeeded");
        expect(typeof result.gapsFound).toBe("number");
        expect(typeof result.queriesAdded).toBe("number");
        expect(typeof result.entitiesSeeded).toBe("number");
      }
    });

    test("processes users and finds gaps (live data)", async ({ request }) => {
      test.skip(!LIVE, "Set E2E_LIVE_CRONS=1 to run live cron tests");

      const res = await request.get("/api/cron/knowledge-gaps", {
        headers: CRON_SECRET
          ? { authorization: `Bearer ${CRON_SECRET}` }
          : {},
      });

      const body = await res.json();

      expect(body.summary.usersProcessed).toBeGreaterThan(0);
      expect(body.summary.errors).toBe(0);
      expect(body.summary.totalGapsFound).toBeGreaterThan(0);
    });
  });

  test.describe("Full cron cycle simulation", () => {
    test("run ingestion → daily → discover-feeds → knowledge-gaps in sequence", async ({
      request,
    }) => {
      test.skip(!LIVE, "Set E2E_LIVE_CRONS=1 to run live cron tests");

      const headers = CRON_SECRET
        ? { authorization: `Bearer ${CRON_SECRET}` }
        : {};

      console.log("Step 1: Running ingestion cron...");
      const ingestRes = await request.get("/api/cron/ingest", { headers });
      expect(ingestRes.status()).toBe(200);
      const ingestBody = await ingestRes.json();
      console.log("  Ingestion summary:", JSON.stringify(ingestBody.summary));
      expect(ingestBody.summary.usersProcessed).toBeGreaterThan(0);

      console.log("Step 2: Running daily briefing cron...");
      const dailyRes = await request.get("/api/cron/daily", { headers });
      expect(dailyRes.status()).toBe(200);
      const dailyBody = await dailyRes.json();
      console.log("  Daily summary:", JSON.stringify(dailyBody.summary));

      const successOrSkipped =
        dailyBody.summary.success + dailyBody.summary.skipped;
      expect(successOrSkipped).toBeGreaterThan(0);

      console.log("Step 3: Running feed discovery cron...");
      const feedRes = await request.get("/api/cron/discover-feeds", {
        headers,
      });
      expect(feedRes.status()).toBe(200);
      const feedBody = await feedRes.json();
      console.log("  Feed discovery summary:", JSON.stringify(feedBody.summary));

      console.log("Step 4: Running knowledge gaps cron...");
      const gapRes = await request.get("/api/cron/knowledge-gaps", {
        headers,
      });
      expect(gapRes.status()).toBe(200);
      const gapBody = await gapRes.json();
      console.log("  Knowledge gaps summary:", JSON.stringify(gapBody.summary));
      expect(gapBody.summary.errors).toBe(0);

      console.log("\nFull cron cycle completed successfully.");
    });
  });
});
