const NEWSAPI_AI_URL = "https://eventregistry.org/api/v1/article/getArticles";

export interface NewsApiArticle {
  uri: string;
  url: string;
  title: string;
  body: string;
  source: { uri: string; title: string };
  dateTimePub: string;
  lang: string;
  sentiment: number | null;
  concepts: { uri: string; label: { eng: string }; type: string }[];
}

export interface NewsApiSearchResult {
  articles: NewsApiArticle[];
  totalResults: number;
}

export class NewsApiAiClient {
  private maxResults: number;
  private lookbackHours: number;

  constructor(opts: { maxResults: number; lookbackHours: number }) {
    this.maxResults = opts.maxResults;
    this.lookbackHours = opts.lookbackHours;
  }

  async searchArticles(query: string): Promise<NewsApiSearchResult> {
    const apiKey = process.env.NEWSAPI_AI_KEY;
    if (!apiKey) {
      console.warn("NEWSAPI_AI_KEY not set — skipping news search");
      return { articles: [], totalResults: 0 };
    }

    const dateEnd = new Date();
    const dateStart = new Date(dateEnd.getTime() - this.lookbackHours * 60 * 60 * 1000);

    const body = {
      action: "getArticles",
      keyword: query,
      keywordSearchMode: "phrase",
      lang: "eng",
      dateStart: dateStart.toISOString().split("T")[0],
      dateEnd: dateEnd.toISOString().split("T")[0],
      articlesPage: 1,
      articlesCount: this.maxResults,
      articlesSortBy: "date",
      resultType: "articles",
      apiKey,
    };

    let response: Response;
    try {
      response = await fetch(NEWSAPI_AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`NewsAPI.ai connection failed: ${msg}`);
      return { articles: [], totalResults: 0 };
    }

    if (response.status === 401 || response.status === 403) {
      console.error("NewsAPI.ai auth error — check NEWSAPI_AI_KEY");
      return { articles: [], totalResults: 0 };
    }

    if (response.status === 429) {
      console.error("NewsAPI.ai rate limited — too many simultaneous requests");
      return { articles: [], totalResults: 0 };
    }

    if (!response.ok) {
      console.error(`NewsAPI.ai error: ${response.status} ${response.statusText}`);
      return { articles: [], totalResults: 0 };
    }

    const data = (await response.json()) as {
      articles?: {
        results?: {
          uri?: string;
          url?: string;
          title?: string;
          body?: string;
          source?: { uri?: string; title?: string };
          dateTimePub?: string;
          lang?: string;
          sentiment?: number | null;
          concepts?: { uri?: string; label?: { eng?: string }; type?: string }[];
        }[];
        totalResults?: number;
      };
    };

    const rawArticles = data.articles?.results ?? [];
    const articles: NewsApiArticle[] = rawArticles.map((a) => ({
      uri: a.uri ?? "",
      url: a.url ?? "",
      title: a.title ?? "",
      body: a.body ?? "",
      source: {
        uri: a.source?.uri ?? "",
        title: a.source?.title ?? "",
      },
      dateTimePub: a.dateTimePub ?? "",
      lang: a.lang ?? "",
      sentiment: a.sentiment ?? null,
      concepts: (a.concepts ?? []).map((c) => ({
        uri: c.uri ?? "",
        label: { eng: c.label?.eng ?? "" },
        type: c.type ?? "",
      })),
    }));

    return {
      articles,
      totalResults: data.articles?.totalResults ?? articles.length,
    };
  }
}
