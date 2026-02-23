import type { NewsIngestionConfig } from "./config";

const GDELT_DOC_API_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

export interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
  tone: number;
  tonePositive: number;
  toneNegative: number;
  tonePolarity: number;
  toneActivity: number;
  toneSelfReference: number;
  gdeltDocId: string;
}

export interface GdeltDocSearchResult {
  articles: GdeltArticle[];
  totalResults: number;
}

export function formatNearQuery(company: string, industryTerms: string[]): string {
  if (industryTerms.length === 0) return `"${company}"`;
  const combined = [company, ...industryTerms.slice(0, 2)].join(" ");
  return `near20:"${combined}"`;
}

function buildSearchUrl(
  query: string,
  timespanHours: number,
  maxResults: number,
  sourceCountries?: string[]
): string {
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    maxrecords: String(maxResults),
    format: "json",
    timespan: `${timespanHours}h`,
    sort: "DateDesc",
  });

  if (sourceCountries && sourceCountries.length > 0) {
    const countryFilter = sourceCountries.map((c) => `sourcecountry:${c}`).join(" OR ");
    params.set("query", `${query} (${countryFilter})`);
  }

  return `${GDELT_DOC_API_BASE}?${params.toString()}`;
}

interface GdeltApiArticle {
  url?: string;
  title?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
  tone?: string;
}

function parseTone(toneStr: string | undefined): {
  tone: number;
  tonePositive: number;
  toneNegative: number;
  tonePolarity: number;
  toneActivity: number;
  toneSelfReference: number;
} {
  if (!toneStr) {
    return { tone: 0, tonePositive: 0, toneNegative: 0, tonePolarity: 0, toneActivity: 0, toneSelfReference: 0 };
  }
  const parts = toneStr.split(",").map(Number);
  return {
    tone: parts[0] ?? 0,
    tonePositive: parts[1] ?? 0,
    toneNegative: parts[2] ?? 0,
    tonePolarity: parts[3] ?? 0,
    toneActivity: parts[4] ?? 0,
    toneSelfReference: parts[5] ?? 0,
  };
}

function parseGdeltDocId(url: string): string {
  const match = url.match(/\/doc\/([^/]+)/);
  return match?.[1] ?? url;
}

export class GdeltDocClient {
  private config: NewsIngestionConfig;
  private lastRequestTime = 0;
  private rateLimitedUntil = 0;

  constructor(config: NewsIngestionConfig) {
    this.config = config;
  }

  async searchArticles(
    query: string,
    sourceCountries?: string[]
  ): Promise<GdeltDocSearchResult> {
    await this.waitForDelay();

    if (Date.now() < this.rateLimitedUntil) {
      return { articles: [], totalResults: 0 };
    }

    const url = buildSearchUrl(
      query,
      this.config.lookbackHours,
      this.config.maxArticlesPerQuery,
      sourceCountries
    );

    const response = await fetch(url);

    if (response.status === 429) {
      this.rateLimitedUntil = Date.now() + this.config.rateLimitCooldownSeconds * 1000;
      return { articles: [], totalResults: 0 };
    }

    if (!response.ok) {
      throw new Error(`GDELT DOC API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { articles?: GdeltApiArticle[] };
    const rawArticles = data.articles ?? [];

    const articles: GdeltArticle[] = rawArticles.map((a) => {
      const toneData = parseTone(a.tone);
      return {
        url: a.url ?? "",
        title: a.title ?? "",
        seendate: a.seendate ?? "",
        socialimage: a.socialimage ?? "",
        domain: a.domain ?? "",
        language: a.language ?? "",
        sourcecountry: a.sourcecountry ?? "",
        ...toneData,
        gdeltDocId: parseGdeltDocId(a.url ?? ""),
      };
    });

    return { articles, totalResults: articles.length };
  }

  isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil;
  }

  private async waitForDelay(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.config.interQueryDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.config.interQueryDelayMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}
