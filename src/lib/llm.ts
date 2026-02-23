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

const MODELS_REQUIRING_MAX_COMPLETION_TOKENS = new Set([
  "gpt-5.2", "gpt-5.2-chat-latest", "gpt-5.2-pro", "gpt-5-mini",
  "o1", "o1-mini", "o1-preview", "o3", "o3-mini", "o4-mini",
]);

export async function chat(
  messages: LlmMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<LlmResponse> {
  const model = options.model ?? "gpt-4o-mini";
  const tokenLimit = options.maxTokens ?? 2048;
  const useNewParam = MODELS_REQUIRING_MAX_COMPLETION_TOKENS.has(model) || model.startsWith("gpt-5");

  const response = await getOpenAI().chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    ...(useNewParam
      ? { max_completion_tokens: tokenLimit }
      : { max_tokens: tokenLimit }),
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
