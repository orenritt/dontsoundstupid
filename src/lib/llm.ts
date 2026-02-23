import OpenAI from "openai";

export type LlmProvider = "openai" | "anthropic";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: LlmProvider;
}

export async function chat(
  messages: LlmMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<LlmResponse> {
  const model = options.model ?? "gpt-4o-mini";
  const response = await getOpenAI().chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
  });

  const choice = response.choices[0];
  return {
    content: choice?.message?.content ?? "",
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    model,
    provider: "openai",
  };
}

export async function embed(
  texts: string[],
  model = "text-embedding-3-small"
): Promise<number[][]> {
  const response = await getOpenAI().embeddings.create({
    model,
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}
