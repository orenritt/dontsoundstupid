const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

export interface PerplexityResult {
  content: string;
  citations: string[];
}

export async function searchPerplexity(
  query: string,
  systemContext?: string
): Promise<PerplexityResult | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn("PERPLEXITY_API_KEY not set — skipping Perplexity research");
    return null;
  }

  try {
    const messages: { role: string; content: string }[] = [];
    if (systemContext) {
      messages.push({ role: "system", content: systemContext });
    }
    messages.push({ role: "user", content: query });

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.error(
        `Perplexity API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      citations?: string[];
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    const citations = data.citations ?? [];

    return { content, citations };
  } catch (err) {
    console.error(
      "Perplexity API call failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
