## 1. Perplexity Client

- [x] 1.1 Create `src/lib/ai-research/perplexity-client.ts` — thin wrapper around Perplexity Sonar API: `searchPerplexity(query: string, systemContext?: string)` that calls `POST https://api.perplexity.ai/chat/completions` with model `sonar`, returns `{ content: string, citations: string[] }`
- [x] 1.2 Handle missing `PERPLEXITY_API_KEY` — return null with a logged warning, don't throw
- [x] 1.3 Handle API errors (rate limits, network failures) — catch and return null with logged error

## 2. Tavily Client

- [x] 2.1 Create `src/lib/ai-research/tavily-client.ts` — thin wrapper around Tavily search API: `searchTavily(query: string, options?: { topic?, timeRange?, maxResults? })` that calls `POST https://api.tavily.com/search`, returns `{ results: { title: string, url: string, content: string, score: number }[] }`
- [x] 2.2 Handle missing `TAVILY_API_KEY` — return null with a logged warning, don't throw
- [x] 2.3 Handle API errors — catch and return null with logged error

## 3. Query Derivation

- [x] 3.1 Create `src/lib/ai-research/query-derivation.ts` — `deriveResearchQueries(profile, user)` that generates two arrays: `perplexityQueries` (from topics, initiatives, concerns, knowledge gaps) and `tavilyQueries` (from impress list companies, peer org names)
- [x] 3.2 Perplexity query format: each topic → "What should a [role] at [company] know about [topic] today?", each initiative → "Latest developments in [initiative]", each knowledge gap → "Key things to understand about [gap] right now"
- [x] 3.3 Tavily query format: each company/org → "[name] news announcements"
- [x] 3.4 Deduplicate queries with identical text before returning

## 4. Research Orchestrator

- [x] 4.1 Create `src/lib/ai-research/research.ts` — `runAiResearch(userId)` that loads user profile, derives queries, executes Perplexity + Tavily in parallel, normalizes results to `RawSignal[]`
- [x] 4.2 Cap Perplexity queries at 5 per run, Tavily queries at 10 per run
- [x] 4.3 Perplexity signal normalization: synthesized answer as `summary`, first citation as `sourceUrl`, "Perplexity" as `sourceLabel`
- [x] 4.4 Tavily signal normalization: result title as `title`, extracted content as `summary`, result URL as `sourceUrl`, domain as `sourceLabel`
- [x] 4.5 Run Perplexity and Tavily batches concurrently (Promise.all on the two groups)

## 5. Module Exports

- [x] 5.1 Create `src/lib/ai-research/index.ts` — export `runAiResearch` and individual clients

## 6. Pipeline Integration

- [x] 6.1 Replace Step 1 in `pipeline.ts` (LLM hallucination signal generation) with a call to `runAiResearch(userId)` that produces `RawSignal[]`
- [x] 6.2 Add ai-research signals to the merge step alongside GDELT, syndication, and newsletter signals
- [x] 6.3 Remove the old `chat()` call for signal generation and related parsing code

## 7. Deep-Dive Upgrade

- [x] 7.1 Update `src/app/api/feedback/deep-dive/route.ts` — if `PERPLEXITY_API_KEY` is set, use Perplexity Sonar with user profile context for the deep-dive response instead of generic LLM call
- [x] 7.2 Include user's role, company, and initiatives in the Perplexity system context for profile-aware deep-dive responses
- [x] 7.3 Fall back to existing `chat()` approach if Perplexity is unconfigured or fails

## 8. Configuration

- [x] 8.1 Add `PERPLEXITY_API_KEY` and `TAVILY_API_KEY` to `.env.example` with comments
