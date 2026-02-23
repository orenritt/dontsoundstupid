## Why

The system has a compounding broadening problem. Topic extraction generalizes user language to parent categories ("nature-based insurance" → "insurtech"), query derivation uses those broad topics as bare search terms, and every ingestion layer (news queries, query refresh, AI research, knowledge gap scan, syndication discovery) explicitly asks for "adjacent topics", "white space", and "cross-cutting trends." The result is a candidate pool where 80%+ of signals are topically adjacent but not actually relevant to the user's specific niche. The scoring agent then picks the "best" of a polluted pool. A person dealing with parametric insurance for coral reef restoration should never be served generic insurtech — only content within their exact content universe, with an extremely narrow exception for seismic events.

## What Changes

- Derive a **content universe** from the user's full profile after onboarding — a prose definition of what's in scope and an explicit exclusion list of what's out. This is system-generated (not user-facing), regenerated when the profile evolves.
- Rewrite **topic extraction** to preserve the user's exact niche phrasing instead of generalizing to taxonomic parent categories. Extract intersectional descriptors, not independent keywords.
- Rewrite **query derivation** across all ingestion layers (news, AI research, syndication, knowledge gap scan) to generate queries scoped to the content universe rather than bare topic keywords. Queries should be intersectional (combining role + niche + specifics) not independent.
- Kill the **broadening bias** in all LLM prompts. Replace "adjacent topics", "white space", and "cross-cutting trends" with instructions to go deeper *within* the content universe — more specific angles, not broader categories.
- Add a **content universe gate** to the scoring agent — a hard binary filter applied before any soft ranking. Signals outside the content universe are rejected unless they meet an extremely narrow "seismic event" threshold (concrete event involving a named entity that would directly change what the user does this week).
- Wire **feedback signals** into content universe evolution — "tune-less" and "not relevant" signals tighten the exclusion list; "tune-more" signals confirm in-scope areas.

## Capabilities

### New Capabilities
- `content-universe`: Derived content universe definition — generation from profile data, storage, refresh lifecycle, and the seismic event exception criteria.

### Modified Capabilities
- `relevance-scoring`: Add content universe gate as priority-zero filter before existing selection criteria. Scoring agent receives the content universe definition and applies hard in/out filtering before novelty, momentum, or any other soft signal.
- `news-ingestion`: Query derivation must use content universe to generate intersectional queries instead of bare topic keywords. Query refresh must deepen within the universe instead of broadening beyond it.
- `ai-research`: Template and LLM-derived research queries must be scoped to the content universe. Kill "white space" and "adjacent" language — replace with "deeper within your niche."
- `user-profile`: Add `contentUniverse` field (prose definition + exclusion list) to the profile model. Generated after onboarding, refreshed on profile changes and feedback accumulation.
- `onboarding-conversation`: Transcript parsing must preserve niche-specific language and extract intersectional descriptors. Rapid-fire "not relevant" classifications feed directly into content universe exclusions.

## Impact

- **Profile model**: New `contentUniverse` jsonb field on `user_profiles` table (prose definition + exclusion list + generation metadata).
- **Transcript parsing** (`parse-transcript.ts`): Rewritten extraction prompt to preserve specificity, avoid parent-category generalization, and produce intersectional topic descriptors.
- **News query derivation** (`news-ingestion/query-derivation.ts`): `deriveFromTopics` rewritten to produce intersectional queries using content universe context.
- **News query refresh** (`news-ingestion/query-refresh.ts`): Prompt rewritten — "deeper within" replaces "adjacent to."
- **AI research query derivation** (`ai-research/query-derivation.ts`): Both template and LLM query generation rewritten to scope queries with content universe context and exclusions.
- **Knowledge gap scan** (`knowledge-gap-scan.ts`): Prompt rewritten to find gaps within the content universe, not cross-industry trends.
- **Syndication discovery** (`syndication/smart-discovery.ts`): Source suggestion prompt constrained to content universe.
- **Scoring agent** (`scoring-agent.ts`): New content universe gate added to system prompt as priority-zero filter. Seismic event exception criteria defined.
- **Pipeline** (`pipeline.ts`): Content universe loaded and passed to scoring agent alongside candidates.
- **Content universe generator**: New module that takes full profile context and produces the universe definition. Called after onboarding completion and on profile evolution triggers.
- **Migration**: Schema migration to add `contentUniverse` column.
