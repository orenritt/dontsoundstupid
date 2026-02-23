## Why

The other ingestion layers collect raw signals — articles, papers, events. But they don't *understand* the user's question or *synthesize* an answer. AI-powered research tools like Perplexity and Tavily can take a profile-derived question ("What happened in the wearables industry that a PM at [company] should know?") and return a sourced, synthesized answer. This is the closest thing to hiring a personal research assistant for each user. It fills gaps that keyword-based ingestion misses and provides pre-interpreted intelligence that's higher signal than raw articles.

## What Changes

- Add an AI Research ingestion layer that generates targeted queries from user profiles and fires them at AI research APIs
- Two research modes:
  1. **Synthesized research** (Perplexity Sonar) — ask profile-derived questions, get sourced answers with citations. High-signal, pre-interpreted.
  2. **Targeted discovery** (Tavily/Exa) — semantic search for specific signals (new competitors, org announcements, conference changes). Fills gaps in keyword-based search.
- Store results as signals in the shared signal store with layer "ai-research"
- Queries are derived from: intelligence goals, impress list interests, peer org monitoring, active initiatives
- Add "ai-research" as a new signal layer

## Capabilities

### New Capabilities
- `ai-research`: AI-powered research ingestion layer using Perplexity and Tavily to generate profile-derived queries and store synthesized results

### Modified Capabilities
- `signal-store`: Add "ai-research" as a signal layer

## Impact

- New AI research query generation and response types
- New signal layer enum value
- Updated DB schema for new layer
- Dependencies: Perplexity Sonar API, Tavily API (or Exa)
