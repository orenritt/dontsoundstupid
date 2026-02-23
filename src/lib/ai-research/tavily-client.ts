const TAVILY_API_URL = "https://api.tavily.com/search";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  results: TavilySearchResult[];
}

interface TavilyOptions {
  topic?: "general" | "news" | "finance";
  timeRange?: "day" | "week" | "month" | "year";
  maxResults?: number;
}

export async function searchTavily(
  query: string,
  options?: TavilyOptions
): Promise<TavilyResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set — skipping Tavily discovery");
    return null;
  }

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        topic: options?.topic ?? "news",
        time_range: options?.timeRange ?? "week",
        max_results: options?.maxResults ?? 5,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      console.error(
        `Tavily API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as {
      results?: {
        title?: string;
        url?: string;
        content?: string;
        score?: number;
      }[];
    };

    const results: TavilySearchResult[] = (data.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: r.content ?? "",
      score: r.score ?? 0,
    }));

    return { results };
  } catch (err) {
    console.error(
      "Tavily API call failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
