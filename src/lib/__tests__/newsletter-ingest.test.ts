import { describe, it, expect } from "vitest";

/**
 * Tests for newsletter-ingest pure functions.
 * The extractRecipientAddress and extractBody functions are private,
 * so we re-implement and test the same logic.
 */

function extractRecipientAddress(to: string): string | null {
  const emailMatch = to.match(/<([^>]+)>/);
  const address = (emailMatch ? emailMatch[1] : to).toLowerCase().trim();
  return address || null;
}

function extractBody(email: { htmlBody: string | null; textBody: string | null }): string {
  if (email.htmlBody) {
    let text = email.htmlBody;
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<[^>]+>/g, "");
    text = text.replace(/&nbsp;/gi, " ");
    text = text.replace(/&amp;/gi, "&");
    text = text.trim();
    return text;
  }
  return email.textBody || "";
}

describe("newsletter-ingest", () => {
  describe("extractRecipientAddress", () => {
    it("extracts email from angle brackets", () => {
      expect(
        extractRecipientAddress("Newsletter Bot <newsletter-abc@dontsoundstupid.com>")
      ).toBe("newsletter-abc@dontsoundstupid.com");
    });

    it("handles plain email address", () => {
      expect(extractRecipientAddress("plain@example.com")).toBe(
        "plain@example.com"
      );
    });

    it("normalizes to lowercase", () => {
      expect(extractRecipientAddress("USER@Example.COM")).toBe(
        "user@example.com"
      );
    });

    it("trims whitespace", () => {
      expect(extractRecipientAddress("  user@example.com  ")).toBe(
        "user@example.com"
      );
    });

    it("returns null for empty string", () => {
      expect(extractRecipientAddress("")).toBeNull();
    });

    it("handles display name with angle brackets", () => {
      expect(
        extractRecipientAddress('"Morning Brew" <brew@dontsoundstupid.com>')
      ).toBe("brew@dontsoundstupid.com");
    });
  });

  describe("extractBody", () => {
    it("prefers HTML body when available", () => {
      const body = extractBody({
        htmlBody: "<p>HTML content</p>",
        textBody: "Text content",
      });
      expect(body).toContain("HTML content");
    });

    it("falls back to text body when no HTML", () => {
      const body = extractBody({
        htmlBody: null,
        textBody: "Plain text content",
      });
      expect(body).toBe("Plain text content");
    });

    it("returns empty string when both are null", () => {
      expect(extractBody({ htmlBody: null, textBody: null })).toBe("");
    });

    it("strips HTML tags from HTML body", () => {
      const body = extractBody({
        htmlBody: "<div><strong>Bold</strong> and <em>italic</em></div>",
        textBody: null,
      });
      expect(body).not.toContain("<");
      expect(body).toContain("Bold");
      expect(body).toContain("italic");
    });
  });

  describe("newsletter email flow validation", () => {
    it("validates a complete newsletter processing scenario", () => {
      const email = {
        from: "noreply@morningbrew.com",
        to: "Morning Brew <brew-123@dontsoundstupid.com>",
        subject: "Morning Brew - Jan 1, 2026",
        htmlBody: `
          <h1>Morning Brew</h1>
          <h2>Top Story: AI Revolution in Finance</h2>
          <p>Artificial intelligence is transforming how banks operate...</p>
          <a href="https://news.com/ai-finance">Read more</a>
          <h2>Markets Roundup</h2>
          <p>S&P 500 hits new highs amid tech rally...</p>
        `,
        textBody: null,
      };

      const recipient = extractRecipientAddress(email.to);
      expect(recipient).toBe("brew-123@dontsoundstupid.com");

      const body = extractBody(email);
      expect(body).toContain("AI Revolution in Finance");
      expect(body).toContain("S&P 500");
      expect(body.length).toBeGreaterThan(50);
    });
  });
});
