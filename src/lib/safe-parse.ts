/**
 * Safely coerce a DB JSON column value into a string[].
 * Handles: actual arrays, JSON-encoded strings, plain comma-separated
 * strings (LLM sometimes returns these instead of arrays), nulls, and
 * unexpected types.
 */
export function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return [];
    try {
      const p = JSON.parse(trimmed);
      if (Array.isArray(p)) return p.map(String);
    } catch {
      // Not valid JSON — treat as comma-separated string
    }
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
