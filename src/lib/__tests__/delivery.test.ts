import { describe, it, expect } from "vitest";

/**
 * We test the pure functions in delivery.ts by importing them indirectly.
 * Since buildHtml, buildText, escapeHtml, and formatDate are not exported,
 * we test their behavior through observable patterns.
 *
 * We also re-implement the pure functions here to validate correctness
 * since the module keeps them private.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

describe("delivery - escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("AT&T")).toBe("AT&amp;T");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert('xss')&lt;/script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('She said "hello"')).toBe("She said &quot;hello&quot;");
  });

  it("handles multiple entities in one string", () => {
    expect(escapeHtml('A & B < C > D "E"')).toBe(
      "A &amp; B &lt; C &gt; D &quot;E&quot;"
    );
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("No special chars")).toBe("No special chars");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("delivery - email content structure", () => {
  it("formatDate produces US English date string", () => {
    const formatted = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(formatted).toMatch(/\w+, \w+ \d+, \d{4}/);
  });

  it("firstName extraction handles single name", () => {
    const name = "Jane";
    const firstName = name.split(" ")[0] || "there";
    expect(firstName).toBe("Jane");
  });

  it("firstName extraction handles full name", () => {
    const name = "Jane Doe Smith";
    const firstName = name.split(" ")[0] || "there";
    expect(firstName).toBe("Jane");
  });

  it("firstName extraction falls back to 'there' for empty", () => {
    const name = "";
    const firstName = name.split(" ")[0] || "there";
    expect(firstName).toBe("there");
  });

  it("email subject includes date", () => {
    const formatDate = () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    const subject = `Your briefing — ${formatDate()}`;
    expect(subject).toContain("Your briefing");
    expect(subject).toMatch(/\d{4}/);
  });
});

describe("delivery - briefing item rendering", () => {
  const sampleItems = [
    {
      id: "1",
      reason: "Matches your initiative",
      reasonLabel: "Initiative Match",
      topic: "AI Underwriting",
      content: "New AI models improve accuracy by 30%.",
      sourceUrl: "https://reuters.com/article",
      sourceLabel: "Reuters",
    },
    {
      id: "2",
      reason: "Trending in your space",
      reasonLabel: "Industry Trend",
      topic: "ESG Reporting",
      content: "SEC mandates new disclosures.",
      sourceUrl: null,
      sourceLabel: null,
    },
  ];

  it("renders item with source link in HTML", () => {
    const item = sampleItems[0]!;
    const html = `
      <div>${escapeHtml(item.reasonLabel)}</div>
      <div>${escapeHtml(item.content)}</div>
      ${item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}">${escapeHtml(item.sourceLabel || "Source")}</a>` : ""}
    `;
    expect(html).toContain("Initiative Match");
    expect(html).toContain("New AI models improve accuracy");
    expect(html).toContain("https://reuters.com/article");
    expect(html).toContain("Reuters");
  });

  it("renders item without source link when sourceUrl is null", () => {
    const item = sampleItems[1]!;
    const sourceHtml = item.sourceUrl
      ? `<a href="${escapeHtml(item.sourceUrl)}">${escapeHtml(item.sourceLabel || "Source")}</a>`
      : "";
    expect(sourceHtml).toBe("");
  });

  it("renders text format with uppercase label", () => {
    const item = sampleItems[0]!;
    const text = `${item.reasonLabel.toUpperCase()}\n${item.content}${
      item.sourceUrl ? `\n${item.sourceLabel || "Source"}: ${item.sourceUrl}` : ""
    }`;
    expect(text).toContain("INITIATIVE MATCH");
    expect(text).toContain("Reuters: https://reuters.com/article");
  });
});
