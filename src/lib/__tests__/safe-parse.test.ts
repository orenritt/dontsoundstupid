import { describe, it, expect } from "vitest";
import { toStringArray } from "../safe-parse";

describe("toStringArray", () => {
  describe("array inputs", () => {
    it("returns string[] unchanged", () => {
      expect(toStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    });

    it("coerces non-string array elements to strings", () => {
      expect(toStringArray([1, 2, 3])).toEqual(["1", "2", "3"]);
    });

    it("handles mixed-type arrays", () => {
      expect(toStringArray(["a", 1, true, null])).toEqual(["a", "1", "true", "null"]);
    });

    it("returns empty array for empty array input", () => {
      expect(toStringArray([])).toEqual([]);
    });
  });

  describe("JSON string inputs", () => {
    it("parses JSON array strings", () => {
      expect(toStringArray('["x","y","z"]')).toEqual(["x", "y", "z"]);
    });

    it("handles JSON arrays with numbers", () => {
      expect(toStringArray("[1, 2, 3]")).toEqual(["1", "2", "3"]);
    });

    it("handles JSON with extra whitespace", () => {
      expect(toStringArray('  ["a", "b"]  ')).toEqual(["a", "b"]);
    });
  });

  describe("comma-separated string inputs", () => {
    it("splits comma-separated strings", () => {
      expect(toStringArray("alpha, beta, gamma")).toEqual(["alpha", "beta", "gamma"]);
    });

    it("trims whitespace from parts", () => {
      expect(toStringArray("  foo ,  bar , baz  ")).toEqual(["foo", "bar", "baz"]);
    });

    it("filters empty parts", () => {
      expect(toStringArray("a,,b, ,c")).toEqual(["a", "b", "c"]);
    });

    it("handles single value", () => {
      expect(toStringArray("solo")).toEqual(["solo"]);
    });
  });

  describe("null / undefined / empty inputs", () => {
    it("returns [] for null", () => {
      expect(toStringArray(null)).toEqual([]);
    });

    it("returns [] for undefined", () => {
      expect(toStringArray(undefined)).toEqual([]);
    });

    it("returns [] for empty string", () => {
      expect(toStringArray("")).toEqual([]);
    });

    it("returns [] for whitespace-only string", () => {
      expect(toStringArray("   ")).toEqual([]);
    });

    it("returns [] for number", () => {
      expect(toStringArray(42)).toEqual([]);
    });

    it("returns [] for boolean", () => {
      expect(toStringArray(true)).toEqual([]);
    });

    it("returns [] for object", () => {
      expect(toStringArray({ key: "value" })).toEqual([]);
    });
  });

  describe("edge cases from LLM outputs", () => {
    it("handles JSON object (non-array) by falling through to comma split", () => {
      const result = toStringArray('{"key": "value"}');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles invalid JSON falling through to comma split", () => {
      expect(toStringArray("{broken json, but comma separated")).toEqual([
        "{broken json",
        "but comma separated",
      ]);
    });
  });
});
