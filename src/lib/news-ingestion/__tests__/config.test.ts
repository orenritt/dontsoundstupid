import { describe, it, expect, vi, afterEach } from "vitest";
import { loadNewsIngestionConfig } from "../config";

describe("loadNewsIngestionConfig", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns defaults when no env vars set", () => {
    const config = loadNewsIngestionConfig();
    expect(config.pollIntervalMinutes).toBe(1440);
    expect(config.maxArticlesPerQuery).toBe(25);
    expect(config.lookbackHours).toBe(24);
    expect(config.rateLimitCooldownSeconds).toBe(60);
    expect(config.interQueryDelayMs).toBe(2000);
    expect(config.maxQueriesPerCycle).toBe(50);
    expect(config.gkgEnabled).toBe(true);
  });

  it("reads from env vars when set", () => {
    process.env = {
      ...originalEnv,
      NEWS_POLL_INTERVAL_MINUTES: "720",
      NEWS_MAX_ARTICLES_PER_QUERY: "10",
      NEWS_GKG_ENABLED: "false",
    };
    const config = loadNewsIngestionConfig();
    expect(config.pollIntervalMinutes).toBe(720);
    expect(config.maxArticlesPerQuery).toBe(10);
    expect(config.gkgEnabled).toBe(false);
  });
});
