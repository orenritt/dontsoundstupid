import { describe, it, expect } from "vitest";
import { contentHash } from "../query-derivation";

describe("contentHash", () => {
  it("produces consistent hashes for the same input", () => {
    const hash1 = contentHash("test query");
    const hash2 = contentHash("test query");
    expect(hash1).toBe(hash2);
  });

  it("is case-insensitive", () => {
    const hash1 = contentHash("Test Query");
    const hash2 = contentHash("test query");
    expect(hash1).toBe(hash2);
  });

  it("trims whitespace", () => {
    const hash1 = contentHash("  test query  ");
    const hash2 = contentHash("test query");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = contentHash("query one");
    const hash2 = contentHash("query two");
    expect(hash1).not.toBe(hash2);
  });
});
