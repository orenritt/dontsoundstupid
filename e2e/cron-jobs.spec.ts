import { test, expect } from "@playwright/test";

/**
 * Cron job E2E tests.
 *
 * These tests hit the real cron API endpoints directly (no browser UI needed).
 * They verify the endpoints respond correctly, handle auth, and return
 * properly shaped responses.
 *
 * For real data testing, set E2E_BASE_URL to your staging environment
 * and CRON_SECRET to the actual secret.
 *
 * For local testing without a real DB, the endpoints will still work
 * but may return 0 users processed.
 */

const CRON_SECRET = process.env.CRON_SECRET || "";

test.describe("Cron job API endpoints", () => {
  test.describe("Authentication", () => {
    test("rejects requests without auth when CRON_SECRET is set", async ({
      request,
    }) => {
      // Only run this test if CRON_SECRET is configured
      test.skip(!CRON_SECRET, "CRON_SECRET not set — skipping auth test");

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
      test.skip(!CRON_SECRET, "CRON_SECRET not set — skipping auth test");

      const res = await request.get("/api/cron/daily", {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      expect(res.status()).toBe(200);
    });
  });

  test.describe("Daily briefing cron", () => {
    test("returns valid summary shape", async ({ request }) => {
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

      // Each result should have the right shape
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
      test.skip(
        !process.env.E2E_LIVE_CRONS,
        "Set E2E_LIVE_CRONS=1 to run live cron tests"
      );

      const res = await request.get("/api/cron/knowledge-gaps", {
        headers: CRON_SECRET
          ? { authorization: `Bearer ${CRON_SECRET}` }
          : {},
      });

      const body = await res.json();

      // With real data, we expect at least some processing
      expect(body.summary.usersProcessed).toBeGreaterThan(0);
      expect(body.summary.errors).toBe(0);

      // At least some gaps should be found
      expect(body.summary.totalGapsFound).toBeGreaterThan(0);
    });
  });

  test.describe("Full cron cycle simulation", () => {
    test("run ingestion → daily → discover-feeds → knowledge-gaps in sequence", async ({
      request,
    }) => {
      test.skip(
        !process.env.E2E_LIVE_CRONS,
        "Set E2E_LIVE_CRONS=1 to run live cron tests"
      );
      test.setTimeout(300_000);

      const headers = CRON_SECRET
        ? { authorization: `Bearer ${CRON_SECRET}` }
        : {};

      // 1. Ingestion — populate signals
      console.log("Step 1: Running ingestion cron...");
      const ingestRes = await request.get("/api/cron/ingest", { headers });
      expect(ingestRes.status()).toBe(200);
      const ingestBody = await ingestRes.json();
      console.log("  Ingestion summary:", JSON.stringify(ingestBody.summary));
      expect(ingestBody.summary.usersProcessed).toBeGreaterThan(0);

      // 2. Daily briefing — compose and deliver
      console.log("Step 2: Running daily briefing cron...");
      const dailyRes = await request.get("/api/cron/daily", { headers });
      expect(dailyRes.status()).toBe(200);
      const dailyBody = await dailyRes.json();
      console.log("  Daily summary:", JSON.stringify(dailyBody.summary));

      const successOrSkipped =
        dailyBody.summary.success + dailyBody.summary.skipped;
      expect(successOrSkipped).toBeGreaterThan(0);

      // 3. Feed discovery
      console.log("Step 3: Running feed discovery cron...");
      const feedRes = await request.get("/api/cron/discover-feeds", {
        headers,
      });
      expect(feedRes.status()).toBe(200);
      const feedBody = await feedRes.json();
      console.log("  Feed discovery summary:", JSON.stringify(feedBody.summary));

      // 4. Knowledge gaps (biweekly)
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
