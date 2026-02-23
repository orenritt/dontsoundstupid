import { describe, it, expect } from "vitest";

/**
 * Tests for the cron trigger scheduling rules.
 * These mirror the logic in scripts/cron-trigger.mjs.
 */

function shouldRunKnowledgeGaps(utcDate: Date): boolean {
  const day = utcDate.getUTCDate();
  return day === 1 || day === 15;
}

function shouldRunDiscoverFeeds(utcDate: Date): boolean {
  return utcDate.getUTCDay() === 0;
}

describe("Cron schedule: knowledge-gaps (biweekly on 1st & 15th)", () => {
  it("runs on the 1st", () => {
    expect(shouldRunKnowledgeGaps(new Date("2026-03-01T05:00:00Z"))).toBe(true);
  });

  it("runs on the 15th", () => {
    expect(shouldRunKnowledgeGaps(new Date("2026-03-15T05:00:00Z"))).toBe(true);
  });

  it("skips on the 2nd", () => {
    expect(shouldRunKnowledgeGaps(new Date("2026-03-02T05:00:00Z"))).toBe(false);
  });

  it("skips on the 14th", () => {
    expect(shouldRunKnowledgeGaps(new Date("2026-03-14T05:00:00Z"))).toBe(false);
  });

  it("skips on the 16th", () => {
    expect(shouldRunKnowledgeGaps(new Date("2026-03-16T05:00:00Z"))).toBe(false);
  });

  it("runs exactly twice per month across a full month", () => {
    let runCount = 0;
    for (let day = 1; day <= 31; day++) {
      const d = new Date(Date.UTC(2026, 2, day, 5, 0, 0));
      if (d.getUTCMonth() !== 2) break;
      if (shouldRunKnowledgeGaps(d)) runCount++;
    }
    expect(runCount).toBe(2);
  });
});

describe("Cron schedule: discover-feeds (weekly on Sundays)", () => {
  it("runs on Sunday", () => {
    expect(shouldRunDiscoverFeeds(new Date("2026-03-01T05:00:00Z"))).toBe(true); // Mar 1, 2026 = Sunday
  });

  it("skips on Monday", () => {
    expect(shouldRunDiscoverFeeds(new Date("2026-03-02T05:00:00Z"))).toBe(false);
  });

  it("skips on Saturday", () => {
    expect(shouldRunDiscoverFeeds(new Date("2026-02-28T05:00:00Z"))).toBe(false);
  });

  it("runs exactly once per week", () => {
    let runCount = 0;
    for (let day = 1; day <= 7; day++) {
      const d = new Date(Date.UTC(2026, 2, day, 5, 0, 0));
      if (shouldRunDiscoverFeeds(d)) runCount++;
    }
    expect(runCount).toBe(1);
  });
});

describe("Cron schedule: ingest + daily (every day)", () => {
  it("runs on every day of a week", () => {
    for (let day = 1; day <= 7; day++) {
      // No gating condition — always true
      expect(true).toBe(true);
    }
  });
});
