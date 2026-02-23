import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  updatePipelineStatus,
  getPipelineStatus,
  clearPipelineStatus,
} from "../pipeline-status";

describe("pipeline-status", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    clearPipelineStatus(userId);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("updatePipelineStatus", () => {
    it("creates a new status entry", () => {
      updatePipelineStatus(userId, "starting");
      const status = getPipelineStatus(userId);
      expect(status).not.toBeNull();
      expect(status!.stage).toBe("starting");
      expect(status!.message).toBe("Starting pipeline...");
    });

    it("preserves startedAt across updates", () => {
      updatePipelineStatus(userId, "starting");
      const first = getPipelineStatus(userId);

      updatePipelineStatus(userId, "loading-profile");
      const second = getPipelineStatus(userId);

      expect(second!.startedAt).toBe(first!.startedAt);
      expect(second!.stage).toBe("loading-profile");
    });

    it("stores briefingId from extra", () => {
      updatePipelineStatus(userId, "done", { briefingId: "b-123" });
      const status = getPipelineStatus(userId);
      expect(status!.briefingId).toBe("b-123");
    });

    it("stores error from extra", () => {
      updatePipelineStatus(userId, "failed", { error: "Something broke" });
      const status = getPipelineStatus(userId);
      expect(status!.error).toBe("Something broke");
    });

    it("maps all stages to their labels", () => {
      const stages = [
        ["starting", "Starting pipeline..."],
        ["loading-profile", "Loading your profile..."],
        ["ingesting-news", "Pulling latest news..."],
        ["ai-research", "Running AI research..."],
        ["loading-signals", "Gathering candidate signals..."],
        ["scoring", "Scoring and selecting signals..."],
        ["composing", "Writing your briefing..."],
        ["saving", "Saving briefing..."],
        ["delivering", "Sending delivery..."],
        ["done", "Briefing ready"],
        ["failed", "Pipeline failed"],
      ] as const;

      for (const [stage, label] of stages) {
        clearPipelineStatus(userId);
        updatePipelineStatus(userId, stage);
        const status = getPipelineStatus(userId);
        expect(status!.message).toBe(label);
      }
    });
  });

  describe("getPipelineStatus", () => {
    it("returns null for unknown user", () => {
      expect(getPipelineStatus("nonexistent")).toBeNull();
    });

    it("returns null after TTL expires (10 minutes)", () => {
      vi.useFakeTimers();
      updatePipelineStatus(userId, "scoring");

      vi.advanceTimersByTime(11 * 60 * 1000);

      expect(getPipelineStatus(userId)).toBeNull();
    });

    it("returns status within TTL window", () => {
      vi.useFakeTimers();
      updatePipelineStatus(userId, "scoring");

      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(getPipelineStatus(userId)).not.toBeNull();
    });
  });

  describe("clearPipelineStatus", () => {
    it("removes status for user", () => {
      updatePipelineStatus(userId, "starting");
      clearPipelineStatus(userId);
      expect(getPipelineStatus(userId)).toBeNull();
    });

    it("does not throw for nonexistent user", () => {
      expect(() => clearPipelineStatus("nonexistent")).not.toThrow();
    });
  });

  describe("isolation between users", () => {
    it("maintains separate status per user", () => {
      updatePipelineStatus("user-a", "starting");
      updatePipelineStatus("user-b", "scoring");

      expect(getPipelineStatus("user-a")!.stage).toBe("starting");
      expect(getPipelineStatus("user-b")!.stage).toBe("scoring");
    });

    it("clearing one user does not affect another", () => {
      updatePipelineStatus("user-a", "starting");
      updatePipelineStatus("user-b", "scoring");

      clearPipelineStatus("user-a");

      expect(getPipelineStatus("user-a")).toBeNull();
      expect(getPipelineStatus("user-b")).not.toBeNull();
    });
  });
});
