import { describe, it, expect } from "vitest";
import {
  htmlToText,
  extractUrls,
  identifyPrimaryUrl,
  parseForwardedEmail,
  verifyWebhookSignature,
} from "../email-forward";
import crypto from "crypto";

describe("email-forward", () => {
  describe("htmlToText", () => {
    it("strips basic HTML tags", () => {
      expect(htmlToText("<p>Hello <b>world</b></p>")).toBe("Hello world");
    });

    it("converts <br> to newlines", () => {
      expect(htmlToText("Line one<br>Line two<br/>Line three")).toBe(
        "Line one\nLine two\nLine three"
      );
    });

    it("converts </p> to double newlines", () => {
      const result = htmlToText("<p>First para</p><p>Second para</p>");
      expect(result).toContain("First para");
      expect(result).toContain("Second para");
    });

    it("converts links to text with URL in parentheses", () => {
      expect(
        htmlToText('<a href="https://example.com">Click here</a>')
      ).toBe("Click here (https://example.com)");
    });

    it("removes style blocks", () => {
      expect(
        htmlToText("<style>.red { color: red; }</style><p>Content</p>")
      ).toBe("Content");
    });

    it("removes script blocks", () => {
      expect(
        htmlToText("<script>alert('hi')</script><p>Content</p>")
      ).toBe("Content");
    });

    it("removes HTML comments", () => {
      expect(htmlToText("<!-- comment --><p>Content</p>")).toBe("Content");
    });

    it("decodes common HTML entities", () => {
      expect(htmlToText("&amp; &lt; &gt; &quot; &#39;")).toBe("& < > \" '");
    });

    it("converts &nbsp; to space", () => {
      expect(htmlToText("word&nbsp;word")).toBe("word word");
    });

    it("collapses multiple spaces", () => {
      expect(htmlToText("too     many    spaces")).toBe("too many spaces");
    });

    it("collapses excess newlines to double", () => {
      expect(htmlToText("a\n\n\n\n\nb")).toBe("a\n\nb");
    });

    it("converts list items", () => {
      const result = htmlToText("<ul><li>Item 1</li><li>Item 2</li></ul>");
      expect(result).toContain("- Item 1");
      expect(result).toContain("- Item 2");
    });

    it("handles complex real-world newsletter HTML", () => {
      const html = `
        <html><head><style>body { font-family: sans-serif; }</style></head>
        <body>
          <h1>Weekly Update</h1>
          <p>Here's what happened:</p>
          <ul>
            <li><a href="https://news.com/1">Big Story</a> - details here</li>
            <li>Another item</li>
          </ul>
          <!-- tracking pixel -->
          <img src="https://track.com/pixel.gif" />
        </body></html>
      `;
      const text = htmlToText(html);
      expect(text).toContain("Weekly Update");
      expect(text).toContain("Big Story");
      expect(text).toContain("https://news.com/1");
      expect(text).not.toContain("<style>");
      expect(text).not.toContain("<img");
    });
  });

  describe("extractUrls", () => {
    it("extracts URLs from text", () => {
      const text = "Visit https://example.com and http://other.org for more.";
      const urls = extractUrls(text);
      expect(urls).toContain("https://example.com");
      expect(urls).toContain("http://other.org");
    });

    it("deduplicates URLs", () => {
      const text = "https://example.com is great. Check https://example.com again.";
      expect(extractUrls(text)).toEqual(["https://example.com"]);
    });

    it("strips trailing punctuation", () => {
      const text = "See https://example.com/article. Also https://other.com/page,";
      const urls = extractUrls(text);
      expect(urls).toContain("https://example.com/article");
      expect(urls).toContain("https://other.com/page");
    });

    it("returns empty array for text without URLs", () => {
      expect(extractUrls("No URLs here at all.")).toEqual([]);
    });

    it("handles URLs with query parameters", () => {
      const urls = extractUrls("https://example.com/search?q=test&page=1");
      expect(urls[0]).toContain("q=test");
    });
  });

  describe("identifyPrimaryUrl", () => {
    it("returns first non-infrastructure URL", () => {
      const urls = [
        "https://mail.com/unsubscribe",
        "https://news.com/article/123",
        "https://other.com/page",
      ];
      expect(identifyPrimaryUrl(urls)).toBe("https://news.com/article/123");
    });

    it("filters out unsubscribe links", () => {
      expect(
        identifyPrimaryUrl(["https://mail.com/unsubscribe"])
      ).toBeNull();
    });

    it("filters out opt-out links", () => {
      expect(identifyPrimaryUrl(["https://mail.com/optout"])).toBeNull();
    });

    it("filters out tracking links", () => {
      expect(
        identifyPrimaryUrl(["https://tracking.service.com/click"])
      ).toBeNull();
    });

    it("filters out mailto links", () => {
      expect(identifyPrimaryUrl(["mailto:someone@example.com"])).toBeNull();
    });

    it("filters out t.co short links", () => {
      expect(identifyPrimaryUrl(["https://t.co/abc123"])).toBeNull();
    });

    it("returns null for empty array", () => {
      expect(identifyPrimaryUrl([])).toBeNull();
    });

    it("returns null when all URLs are infrastructure", () => {
      expect(
        identifyPrimaryUrl([
          "https://mail.com/unsubscribe",
          "https://click.service.com/track",
          "mailto:noreply@example.com",
        ])
      ).toBeNull();
    });
  });

  describe("parseForwardedEmail", () => {
    it("extracts forwarded content and annotation", () => {
      const email = {
        from: "user@example.com",
        to: "forward@dontsoundstupid.com",
        subject: "Fwd: Interesting article",
        textBody:
          "Check this out!\n\n---------- Forwarded message ----------\nFrom: sender@news.com\nDate: Mon, Jan 1, 2026\nSubject: Breaking News\n\nActual content here.",
        htmlBody: null,
        headers: {},
        receivedAt: "2026-01-01T00:00:00Z",
      };

      const parsed = parseForwardedEmail(email);
      expect(parsed.userAnnotation).toBe("Check this out!");
      expect(parsed.forwardedContent).toContain("Forwarded message");
      expect(parsed.originalSender).toBe("sender@news.com");
      expect(parsed.subject).toBe("Fwd: Interesting article");
    });

    it("handles email with only HTML body", () => {
      const email = {
        from: "user@example.com",
        to: "forward@app.com",
        subject: "Fwd: News",
        textBody: null,
        htmlBody: "<p>Some content with <a href='https://example.com'>a link</a></p>",
        headers: {},
        receivedAt: "2026-01-01T00:00:00Z",
      };

      const parsed = parseForwardedEmail(email);
      expect(parsed.forwardedContent).toContain("Some content");
      expect(parsed.extractedUrls).toContain("https://example.com");
    });

    it("handles empty email body", () => {
      const email = {
        from: "user@example.com",
        to: "forward@app.com",
        subject: "Empty",
        textBody: "",
        htmlBody: null,
        headers: {},
        receivedAt: "2026-01-01T00:00:00Z",
      };

      const parsed = parseForwardedEmail(email);
      expect(parsed.forwardedContent).toBe("");
      expect(parsed.extractedUrls).toEqual([]);
      expect(parsed.primaryUrl).toBeNull();
    });

    it("detects 'Begin forwarded message' boundary", () => {
      const email = {
        from: "user@example.com",
        to: "forward@app.com",
        subject: "Fwd: Article",
        textBody: "My notes\n\nBegin forwarded message:\nFrom: someone@test.com\n\nContent here",
        htmlBody: null,
        headers: {},
        receivedAt: "2026-01-01T00:00:00Z",
      };

      const parsed = parseForwardedEmail(email);
      expect(parsed.userAnnotation).toBe("My notes");
    });

    it("detects 'Original Message' boundary", () => {
      const email = {
        from: "user@example.com",
        to: "forward@app.com",
        subject: "FW: Stuff",
        textBody: "FYI\n\n----- Original Message -----\nFrom: sender@example.com\n\nThe original",
        htmlBody: null,
        headers: {},
        receivedAt: "2026-01-01T00:00:00Z",
      };

      const parsed = parseForwardedEmail(email);
      expect(parsed.userAnnotation).toBe("FYI");
    });

    it("extracts URLs from forwarded content", () => {
      const email = {
        from: "user@example.com",
        to: "forward@app.com",
        subject: "Fwd: Links",
        textBody: "Read https://article.com/story and https://blog.com/post",
        htmlBody: null,
        headers: {},
        receivedAt: "2026-01-01T00:00:00Z",
      };

      const parsed = parseForwardedEmail(email);
      expect(parsed.extractedUrls).toContain("https://article.com/story");
      expect(parsed.extractedUrls).toContain("https://blog.com/post");
      expect(parsed.primaryUrl).toBe("https://article.com/story");
    });
  });

  describe("verifyWebhookSignature", () => {
    it("verifies valid HMAC signature", () => {
      const secret = "test-secret-key";
      const payload = '{"event":"inbound"}';
      const signature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      expect(
        verifyWebhookSignature(payload, signature, {
          webhookSecret: secret,
          maxForwardsPerUserPerDay: 20,
          urlEnrichmentTimeoutMs: 5000,
        })
      ).toBe(true);
    });

    it("rejects invalid signature (throws on length mismatch)", () => {
      const secret = "test-secret";
      const payload = '{"event":"inbound"}';
      const wrongSig = crypto
        .createHmac("sha256", "different-secret")
        .update(payload)
        .digest("hex");

      expect(
        verifyWebhookSignature(payload, wrongSig, {
          webhookSecret: secret,
          maxForwardsPerUserPerDay: 20,
          urlEnrichmentTimeoutMs: 5000,
        })
      ).toBe(false);
    });

    it("rejects when no secret configured", () => {
      expect(
        verifyWebhookSignature('{"event":"inbound"}', "any-sig", {
          webhookSecret: "",
          maxForwardsPerUserPerDay: 20,
          urlEnrichmentTimeoutMs: 5000,
        })
      ).toBe(false);
    });
  });
});
