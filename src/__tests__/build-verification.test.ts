/**
 * Build Verification Test (BVT)
 *
 * Validates that the project builds successfully and critical modules
 * can be imported without errors. Run this at every deploy to catch
 * broken imports, missing dependencies, and TypeScript issues.
 */
import { describe, it, expect } from "vitest";

describe("Build Verification — Module Imports", () => {
  it("imports safe-parse module", async () => {
    const mod = await import("@/lib/safe-parse");
    expect(mod.toStringArray).toBeDefined();
    expect(typeof mod.toStringArray).toBe("function");
  });

  it("imports pipeline-status module", async () => {
    const mod = await import("@/lib/pipeline-status");
    expect(mod.updatePipelineStatus).toBeDefined();
    expect(mod.getPipelineStatus).toBeDefined();
    expect(mod.clearPipelineStatus).toBeDefined();
  });

  it("imports news ingestion config module", async () => {
    const mod = await import("@/lib/news-ingestion/config");
    expect(mod.loadNewsIngestionConfig).toBeDefined();
  });

  it("imports email-forward module", async () => {
    const mod = await import("@/lib/email-forward");
    expect(mod.htmlToText).toBeDefined();
    expect(mod.extractUrls).toBeDefined();
    expect(mod.identifyPrimaryUrl).toBeDefined();
    expect(mod.parseForwardedEmail).toBeDefined();
    expect(mod.verifyWebhookSignature).toBeDefined();
  });

  it("imports model types", async () => {
    const mod = await import("@/models/email-forward");
    expect(mod.DEFAULT_EMAIL_FORWARD_CONFIG).toBeDefined();
    expect(mod.DEFAULT_EMAIL_FORWARD_CONFIG.maxForwardsPerUserPerDay).toBe(20);
  });
});

describe("Build Verification — Pure Function Sanity", () => {
  it("toStringArray handles basic cases", async () => {
    const { toStringArray } = await import("@/lib/safe-parse");
    expect(toStringArray(["a", "b"])).toEqual(["a", "b"]);
    expect(toStringArray(null)).toEqual([]);
    expect(toStringArray("x,y")).toEqual(["x", "y"]);
  });

  it("news config returns valid defaults", async () => {
    const { loadNewsIngestionConfig } = await import("@/lib/news-ingestion/config");
    const config = loadNewsIngestionConfig();
    expect(config.pollIntervalMinutes).toBeGreaterThan(0);
    expect(config.maxArticlesPerQuery).toBeGreaterThan(0);
    expect(config.lookbackHours).toBeGreaterThan(0);
    expect(config.maxQueriesPerCycle).toBeGreaterThan(0);
  });

  it("htmlToText converts basic HTML", async () => {
    const { htmlToText } = await import("@/lib/email-forward");
    const result = htmlToText("<p>Hello <b>world</b></p>");
    expect(result).toContain("Hello");
    expect(result).toContain("world");
    expect(result).not.toContain("<");
  });

  it("pipeline status lifecycle works", async () => {
    const { updatePipelineStatus, getPipelineStatus, clearPipelineStatus } =
      await import("@/lib/pipeline-status");

    const testId = `bvt-${Date.now()}`;
    updatePipelineStatus(testId, "starting");
    expect(getPipelineStatus(testId)).not.toBeNull();
    clearPipelineStatus(testId);
    expect(getPipelineStatus(testId)).toBeNull();
  });
});

describe("Build Verification — Environment", () => {
  it("node version is 18+", () => {
    const major = parseInt(process.version.slice(1).split(".")[0]!, 10);
    expect(major).toBeGreaterThanOrEqual(18);
  });

  it("can use crypto.randomUUID", () => {
    const uuid = crypto.randomUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("can use structuredClone", () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = structuredClone(obj);
    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
  });
});
