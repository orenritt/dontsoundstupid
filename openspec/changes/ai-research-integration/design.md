## Context

The pipeline currently generates candidate signals by asking gpt-4o-mini to invent 15-25 items from its training data (Step 1 in `pipeline.ts`). These are not real-time, not cited, and often hallucinated. The ai-research spec defines two external APIs to replace this: Perplexity Sonar for synthesized research (overview questions with citations) and Tavily for targeted discovery (entity-specific web search with extracted content).

Both APIs are simple REST endpoints. Perplexity uses an OpenAI-compatible chat completions format (`POST https://api.perplexity.ai/chat/completions` with model `sonar`). Tavily uses `POST https://api.tavily.com/search`. Neither requires an SDK.

The deep-dive feature (`/api/feedback/deep-dive`) currently uses a plain gpt-4o-mini call. This should be upgraded to Perplexity for grounded answers with citations.

## Goals / Non-Goals

**Goals:**
- Replace hallucinated LLM signals with real-time research from Perplexity and Tavily
- Derive research queries from user profile elements (topics, initiatives, concerns, impress list, peer orgs, knowledge gaps)
- Preserve the existing pipeline architecture — ai-research signals feed into the same scoring agent as GDELT, syndication, and newsletter signals
- Upgrade deep-dive to use Perplexity for cited, grounded responses
- Graceful degradation: if either API is unconfigured or fails, the pipeline continues with other signal sources

**Non-Goals:**
- Query deduplication across users (spec mentions this but we're single-user for now — defer)
- Storing signals in a signal store (the signal-store spec is unimplemented — signals flow directly into the pipeline's candidate pool)
- Async/background research runs (research happens synchronously during pipeline execution)

## Decisions

### 1. Query routing: Perplexity for synthesis, Tavily for discovery

Perplexity excels at answering "What's happening with X?" — it returns a synthesized paragraph with citations. Tavily excels at finding specific results — "recent announcements from Acme Corp" returns individual articles with URLs and content.

**Routing logic:**
- Topics, initiatives, concerns, knowledge gaps → Perplexity (broad "what should I know about X today?" queries)
- Impress list companies, peer orgs → Tavily with `topic: "news"` and `time_range: "week"` (targeted entity search)

Each Perplexity response becomes one signal (synthesized answer + citations). Each Tavily result becomes one signal (title + content + URL).

### 2. New module at `src/lib/ai-research/`

Structure:
- `perplexity-client.ts` — thin wrapper around Perplexity chat completions API
- `tavily-client.ts` — thin wrapper around Tavily search API
- `query-derivation.ts` — generates research queries from user profile
- `research.ts` — orchestrates query derivation → API calls → signal normalization
- `index.ts` — public exports

### 3. Pipeline integration: replace Step 1, not augment

The current Step 1 (LLM hallucination) is fully replaced. The ai-research layer becomes a peer of GDELT, syndication, and newsletter layers — producing `RawSignal[]` that merges into the candidate pool. The step still appears early in the pipeline but now calls real APIs.

### 4. Deep-dive upgrade: Perplexity with profile context

The deep-dive endpoint switches from `chat()` to a Perplexity Sonar call. The query includes the briefing item topic, original content, AND the user's profile context (role, company, initiatives) so the research is framed for the user's perspective. Falls back to the existing LLM approach if Perplexity is unconfigured.

### 5. API key handling

Both keys are optional. If `PERPLEXITY_API_KEY` is missing, Perplexity queries are skipped. If `TAVILY_API_KEY` is missing, Tavily queries are skipped. If both are missing, the ai-research layer produces zero signals (other layers still run). A log warning is emitted for each missing key.

## Risks / Trade-offs

- **Cost**: Perplexity Sonar charges per request (~$5/1000 queries for sonar). Tavily charges per search credit. Mitigated by capping queries per pipeline run (max 5 Perplexity + 10 Tavily per user).
- **Latency**: Two external API calls add latency to pipeline execution. Mitigated by running Perplexity and Tavily queries in parallel.
- **Rate limits**: Both APIs have rate limits. Mitigated by try/catch with graceful degradation — a failed query doesn't abort the pipeline.
- **Perplexity citation quality**: Citations may not always be directly accessible (paywalled, dead links). This is acceptable — the citation is metadata, not the primary content.
