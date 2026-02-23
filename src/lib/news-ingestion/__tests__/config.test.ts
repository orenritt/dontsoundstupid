import { describe, it, expect } from "vitest";
import { loadNewsIngestionConfig } from "../config";

describe("loadNewsIngestionConfig", () => {
  it("returns valid config object", () => {
    const config = loadNewsIngestionConfig();
    expect(config.pollIntervalMinutes).toBeGreaterThan(0);
    expect(config.maxArticlesPerQuery).toBeGreaterThan(0);
    expect(config.lookbackHours).toBeGreaterThan(0);
    expect(config.maxQueriesPerCycle).toBeGreaterThan(0);
  });

  it("respects env overrides", () => {
    const original = process.env.NEWS_MAX_ARTICLES_PER_QUERY;
    process.env.NEWS_MAX_ARTICLES_PER_QUERY = "99";
    const config = loadNewsIngestionConfig();
    expect(config.maxArticlesPerQuery).toBe(99);
    process.env.NEWS_MAX_ARTICLES_PER_QUERY = original;
  });
});
