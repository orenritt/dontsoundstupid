import { describe, it, expect } from "vitest";
import { matchesContentUniverse } from "../ingest";
import type { ContentUniverse } from "../../../models/content-universe";

const UNIVERSE: ContentUniverse = {
  definition: "Cloud infrastructure and enterprise AI platforms",
  coreTopics: ["cloud infrastructure", "enterprise AI", "kubernetes orchestration"],
  exclusions: ["consumer electronics", "social media marketing"],
  seismicThreshold: "Major acquisition, regulatory ruling, or platform outage affecting enterprise cloud",
  generatedAt: "2026-02-20T00:00:00Z",
  generatedFrom: ["parsedTopics", "parsedInitiatives"],
  version: 1,
};

describe("matchesContentUniverse", () => {
  it("passes when title contains a coreTopic", () => {
    expect(
      matchesContentUniverse("New cloud infrastructure tools announced", "Some details here", UNIVERSE)
    ).toBe(true);
  });

  it("passes when summary contains a coreTopic", () => {
    expect(
      matchesContentUniverse("Big announcement today", "This impacts enterprise AI platforms", UNIVERSE)
    ).toBe(true);
  });

  it("passes when both coreTopic and exclusion match (coreTopic takes precedence)", () => {
    expect(
      matchesContentUniverse(
        "Cloud infrastructure meets consumer electronics",
        "Convergence trend",
        UNIVERSE
      )
    ).toBe(true);
  });

  it("rejects when only exclusion matches", () => {
    expect(
      matchesContentUniverse("New social media marketing trends", "Latest strategies", UNIVERSE)
    ).toBe(false);
  });

  it("rejects when no coreTopic or exclusion matches", () => {
    expect(
      matchesContentUniverse("Sports team wins championship", "Great game last night", UNIVERSE)
    ).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(
      matchesContentUniverse("ENTERPRISE AI Platform Launch", "Details below", UNIVERSE)
    ).toBe(true);
  });

  it("passes all articles when universe is null", () => {
    expect(
      matchesContentUniverse("Totally random headline", "Nothing relevant", null)
    ).toBe(true);
  });
});
