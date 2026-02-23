import OpenAI from "openai";
import { createLogger } from "./logger";

const log = createLogger("llm");

export type LlmProvider = "openai" | "anthropic";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      log.error("OPENAI_API_KEY is not set — LLM calls will fail");
    }
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

  const start = Date.now();
  log.debug({ model, messageCount: messages.length, tokenLimit }, "LLM chat request");

  try {
    const response = await getOpenAI().chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      ...(useNewParam
        ? { max_completion_tokens: tokenLimit }
        : { max_tokens: tokenLimit }),
    });

    const choice = response.choices[0];
    const ms = Date.now() - start;
    const promptTokens = response.usage?.prompt_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;

    log.debug({ model, ms, promptTokens, completionTokens, finishReason: choice?.finish_reason }, "LLM chat response");

    return {
      content: choice?.message?.content ?? "",
      promptTokens,
      completionTokens,
      model,
      provider: "openai",
    };
  } catch (err) {
    const ms = Date.now() - start;
    log.error({ err, model, ms, messageCount: messages.length }, "LLM chat call FAILED");
    throw err;
  }
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
