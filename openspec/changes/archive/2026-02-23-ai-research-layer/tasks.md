## 1. Signal Layer Update

- [x] 1.1 Add "ai-research" to SignalLayer type in `src/models/signal.ts`
- [x] 1.2 Update signal layer Zod enum in `src/models/schema.ts`
- [x] 1.3 Update signal_layer enum in `src/db/schema.sql`

## 2. AI Research Data Model

- [x] 2.1 Create `src/models/ai-research.ts` with: ResearchProvider enum (perplexity, tavily), ResearchQuery type (query text, derived-from profile element, provider, template ID), ResearchResponse type (provider, content, citations, raw response)
- [x] 2.2 Create QueryTemplate type for profile-to-query mapping
- [x] 2.3 Add Zod schemas for AI research types in `src/models/schema.ts`
- [x] 2.4 Export new types from `src/models/index.ts`

## 3. Verify

- [x] 3.1 Run TypeScript compiler — all files compile clean
