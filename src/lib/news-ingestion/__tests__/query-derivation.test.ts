import { describe, it, expect } from "vitest";
import { contentHash } from "../query-derivation";
import { formatNearQuery } from "../gdelt-doc-client";

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

describe("formatNearQuery", () => {
  it("wraps company name in quotes when no industry terms", () => {
    const result = formatNearQuery("Acme Corp", []);
    expect(result).toBe('"Acme Corp"');
  });

  it("combines company with industry terms using NEAR operator", () => {
    const result = formatNearQuery("Acme Corp", ["fintech", "payments"]);
    expect(result).toBe('near20:"Acme Corp fintech payments"');
  });

  it("caps industry terms at 2", () => {
    const result = formatNearQuery("Acme Corp", ["a", "b", "c", "d"]);
    expect(result).toBe('near20:"Acme Corp a b"');
  });
});
