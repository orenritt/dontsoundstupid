import { describe, it, expect, vi, beforeEach } from "vitest";
import { GdeltDocClient } from "../gdelt-doc-client";

const mockConfig = {
  pollIntervalMinutes: 1440,
  maxArticlesPerQuery: 25,
  lookbackHours: 24,
  rateLimitCooldownSeconds: 60,
  interQueryDelayMs: 0,
  maxQueriesPerCycle: 50,
  gkgEnabled: true,
};

describe("GdeltDocClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses article response with tone data", async () => {
    const mockResponse = {
      articles: [
        {
          url: "https://example.com/article1",
          title: "Test Article",
          seendate: "20260223T120000Z",
          socialimage: "",
          domain: "example.com",
          language: "English",
          sourcecountry: "United States",
          tone: "2.5,5.0,2.5,3.0,1.0,0.5",
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const client = new GdeltDocClient(mockConfig);
    const result = await client.searchArticles("test query");

    expect(result.articles).toHaveLength(1);
    const article = result.articles[0]!;
    expect(article.title).toBe("Test Article");
    expect(article.domain).toBe("example.com");
    expect(article.tonePositive).toBe(5.0);
    expect(article.toneNegative).toBe(2.5);
    expect(article.tonePolarity).toBe(3.0);
    expect(article.toneActivity).toBe(1.0);
    expect(article.toneSelfReference).toBe(0.5);
  });

  it("handles empty response gracefully", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);

    const client = new GdeltDocClient(mockConfig);
    const result = await client.searchArticles("test");

    expect(result.articles).toHaveLength(0);
    expect(result.totalResults).toBe(0);
  });

  it("returns empty on rate limit (429)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    } as Response);

    const client = new GdeltDocClient(mockConfig);
    const result = await client.searchArticles("test");

    expect(result.articles).toHaveLength(0);
    expect(client.isRateLimited()).toBe(true);
  });

  it("throws on non-429 errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    const client = new GdeltDocClient(mockConfig);
    await expect(client.searchArticles("test")).rejects.toThrow("GDELT DOC API error");
  });

  it("handles missing tone data gracefully", async () => {
    const mockResponse = {
      articles: [
        {
          url: "https://example.com/no-tone",
          title: "No Tone Article",
          domain: "example.com",
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const client = new GdeltDocClient(mockConfig);
    const result = await client.searchArticles("test");

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]!.tonePositive).toBe(0);
    expect(result.articles[0]!.toneNegative).toBe(0);
    expect(result.articles[0]!.tonePolarity).toBe(0);
  });
});
