## Why

Impress-list, peer-org, and intelligence-goal query sources bypass the content universe entirely, pulling in broadly irrelevant news (e.g., all Google headlines when the user only cares about Google Cloud infrastructure). The content universe was added to scope industry-topic queries and the scoring agent gate, but three of the four query sources were never constrained — flooding the candidate pool with noise that wastes API quota and degrades briefing quality even when the scoring agent gate catches most of it.

## What Changes

- Scope impress-list queries to the user's content universe by appending core-topic context terms (e.g., `"Google" AND "cloud infrastructure"` instead of just `"Google"`)
- Scope peer-org queries similarly — cross-reference org names with content universe definition
- Scope intelligence-goal queries by injecting content universe framing into the goal detail text
- Add a hard post-fetch relevance filter that drops signals failing a fast keyword check against coreTopics before they enter the signal store — a programmatic safety net independent of the LLM scoring gate
- Preserve fallback behavior when content universe is null (no scoping, current behavior)

## Capabilities

### New Capabilities

- `ingestion-relevance-filter`: Hard programmatic post-fetch filter that drops signals outside the content universe before storage

### Modified Capabilities

- `news-ingestion`: Query derivation for impress-list, peer-org, and intelligence-goal sources must incorporate content universe scoping

## Impact

- `src/lib/news-ingestion/query-derivation.ts` — modify `deriveFromImpressList`, `deriveFromPeerOrgs`, `deriveFromIntelligenceGoals` to accept and use content universe
- `src/lib/news-ingestion/ingest.ts` — add post-fetch relevance filter before signal insertion
- `src/models/content-universe.ts` — may need to expose a fast matching utility
- Existing signals in the database are unaffected; only new ingestion is scoped
- API quota usage should decrease as irrelevant results are filtered earlier
