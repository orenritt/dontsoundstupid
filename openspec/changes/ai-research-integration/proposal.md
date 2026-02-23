## Why

The pipeline's "Step 1" currently asks gpt-4o-mini to *invent* 15-25 signals from its training data. These are stale hallucinations, not real intelligence. The ai-research spec already defines how to replace this with real-time research via Perplexity Sonar (synthesized answers with citations) and Tavily (targeted web search with extracted content). This also upgrades the deep-dive feature from a generic LLM answer to a grounded Perplexity research query.

## What Changes

- Replace the LLM signal-generation step in the pipeline with Perplexity Sonar and Tavily API calls that produce grounded, cited signals
- Build a query derivation layer that generates research queries from user profile elements (topics, initiatives, concerns, impress list companies, peer orgs, knowledge gaps)
- Route synthesized/overview queries to Perplexity, targeted/entity-specific queries to Tavily
- Upgrade the deep-dive endpoint to use Perplexity for on-demand research with profile context
- Add API key configuration for both services

## Capabilities

### New Capabilities
_(none — the ai-research spec already exists)_

### Modified Capabilities
- `ai-research`: Implement the Perplexity Sonar and Tavily integrations defined in the existing spec. Currently the spec exists but no code implements it — the pipeline uses a plain LLM call instead.
- `briefing-interaction`: Upgrade deep-dive to use Perplexity research instead of generic LLM response.

## Impact

- `src/lib/pipeline.ts` — Replace Step 1 (LLM signal generation) with Perplexity + Tavily research layer
- New `src/lib/ai-research/` module — Perplexity client, Tavily client, query derivation, research orchestrator
- `src/app/api/feedback/deep-dive/route.ts` — Upgrade to use Perplexity
- New env vars: `PERPLEXITY_API_KEY`, `TAVILY_API_KEY`
- New npm dependencies: none expected (both APIs are standard REST — use fetch)
