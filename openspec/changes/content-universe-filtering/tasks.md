## 1. Schema & Types

- [x] 1.1 Add `ContentUniverse` TypeScript interface to `src/models/` (definition, coreTopics, exclusions, seismicThreshold, generatedAt, generatedFrom, version)
- [x] 1.2 Add `contentUniverse` jsonb column to `userProfiles` table in `src/lib/schema.ts` (nullable, typed as `ContentUniverse | null`)
- [x] 1.3 Create database migration to add `content_universe` column to `user_profiles` table
- [x] 1.4 Add `contextTerms` jsonb column to `userProfiles` table in `src/lib/schema.ts` for the two-tier topic extraction (nullable string array)
- [x] 1.5 Create database migration to add `context_terms` column to `user_profiles` table

## 2. Content Universe Generator

- [x] 2.1 Create `src/lib/content-universe.ts` with `generateContentUniverse(userId)` function
- [x] 2.2 Implement LLM prompt that takes full profile context (transcript, parsedTopics, initiatives, concerns, expertAreas, weakAreas, knowledgeGaps, title, company, impress contacts, peer orgs, rapid-fire classifications) and produces the ContentUniverse structure
- [x] 2.3 Implement exclusion derivation from rapid-fire "not-relevant" classifications — inject directly into exclusions
- [x] 2.4 Implement sparse profile fallback — wider coreTopics, fewer exclusions, more permissive seismic threshold when profile has <3 topics and <2 initiatives
- [x] 2.5 Implement idempotent regeneration — detect when inputs haven't materially changed, skip version increment
- [x] 2.6 Implement feedback-driven regeneration — accept accumulated exclusion candidates from tune-less/not-relevant feedback, merge additively into exclusion list
- [x] 2.7 Write unit tests for content universe generator (mock LLM, verify structure, test sparse profile fallback, test exclusion merging)

## 3. Content Universe Lifecycle Triggers

- [x] 3.1 Wire trigger after onboarding completion — call `generateContentUniverse` in the onboarding completion handler (after profile fields + rapid-fire are populated)
- [x] 3.2 Wire trigger on profile update — detect changes to parsedTopics, parsedInitiatives, parsedConcerns, or rapidFireClassifications in the profile update API route and call `generateContentUniverse`
- [x] 3.3 Wire trigger on feedback accumulation — in the feedback API, count tune-less/not-relevant signals since last `generatedAt`, trigger regeneration when count >= 3
- [x] 3.4 Create backfill script to generate content universes for existing users who already have profiles

## 4. Topic Extraction Rewrite

- [x] 4.1 Rewrite `parse-transcript.ts` LLM prompt to produce two-tier extraction: `topics` (intersectional niche descriptors) and `contextTerms` (individual context terms that must NOT be used as standalone queries)
- [x] 4.2 Add explicit prompt instructions: "Do NOT generalize to parent categories. If the user works at the intersection of two fields, the topic is the intersection, not each field independently."
- [x] 4.3 Persist `contextTerms` to the new profile column alongside existing `parsedTopics`
- [x] 4.4 Update test fixtures in `src/__tests__/helpers/mocks.ts` and `pipeline-live-compose.test.ts` to reflect intersectional topic format

## 5. News Query Derivation Rewrite

- [x] 5.1 Rewrite `deriveFromTopics` in `src/lib/news-ingestion/query-derivation.ts` — when content universe exists, use coreTopics entries as quoted phrase queries instead of bare parsedTopics keywords
- [x] 5.2 Add fallback path in `deriveFromTopics` — when content universe is null, preserve current behavior using parsedTopics
- [x] 5.3 Rewrite query refresh prompt in `src/lib/news-ingestion/query-refresh.ts` — include content universe definition and exclusion list, replace "adjacent topics" / "emerging areas they haven't mentioned" language with "deeper, more specific angles WITHIN the content universe"
- [x] 5.4 Add explicit exclusion instruction to query refresh prompt — "Do NOT generate queries about: [exclusions list]"

## 6. AI Research Query Derivation Rewrite

- [x] 6.1 Rewrite template queries in `src/lib/ai-research/query-derivation.ts` `deriveTemplateQueries` — when content universe exists, scope each Perplexity query with universe definition and exclusions instead of bare topic
- [x] 6.2 Rewrite LLM query prompt in `src/lib/ai-research/query-derivation.ts` `deriveLlmQueries` — include content universe definition + exclusions, replace "white space" / "adjacent developments" / "cross-cutting trends" language with "deeper within their niche"
- [x] 6.3 Add explicit exclusion list to LLM query prompt — "Do NOT generate queries about: [exclusions list]"
- [x] 6.4 Add fallback path — when content universe is null, preserve current query generation behavior

## 7. Knowledge Gap Scan Rewrite

- [x] 7.1 Rewrite gap scan prompt in `src/lib/knowledge-gap-scan.ts` — include content universe definition and exclusion list
- [x] 7.2 Replace "cross-industry trends" / "broader developments" language with "emerging concepts, companies, regulations, and technologies WITHIN the user's content universe"
- [x] 7.3 Add post-LLM filter — remove any gap items whose name or search query matches content universe exclusions before creating news queries
- [x] 7.4 Add fallback path — when content universe is null, preserve current gap scan behavior

## 8. Syndication Discovery Rewrite

- [x] 8.1 Rewrite source suggestion prompt in `src/lib/syndication/smart-discovery.ts` — include content universe definition and exclusion list
- [x] 8.2 Add explicit instruction: "Only suggest sources that cover the user's specific niche as described in the content universe. Do NOT suggest general industry sources that cover topics in the exclusion list."

## 9. Scoring Agent Content Universe Gate

- [x] 9.1 Update `buildSystemPrompt` in `src/lib/scoring-agent.ts` — add CONTENT UNIVERSE GATE section with full universe definition, coreTopics, exclusions, and seismicThreshold
- [x] 9.2 Position the gate as priority-zero in the selection criteria — before meeting prep, novelty, relevance, or any other criteria
- [x] 9.3 Add seismic event exception instructions with the four concrete criteria (named entity, concrete event, changes user's week, niche colleague would mention)
- [x] 9.4 Add instruction that fewer selections is BETTER than including signals that failed the gate
- [x] 9.5 Add "seismic-event" to the allowed reason types in submit_selections
- [x] 9.6 Add fallback — when content universe is null, skip the gate section entirely

## 10. Pipeline Integration

- [x] 10.1 Update `runPipeline` in `src/lib/pipeline.ts` to load the user's content universe from profile and pass it to the scoring agent
- [x] 10.2 Add `contentUniverseApplied` boolean and `gateRejectedCount` number to the scoring result diagnostics
- [x] 10.3 Log content universe version used in pipeline diagnostics

## 11. Test Fixtures & Mocks Update

- [x] 11.1 Update `FIXTURES.profile` in `src/__tests__/helpers/mocks.ts` to include a sample `contentUniverse` object
- [x] 11.2 Update `FAKE_PROFILE` in `pipeline-live-compose.test.ts` to include a sample `contentUniverse` object
- [x] 11.3 Update e2e API mocks in `e2e/helpers/api-mocks.ts` if they reference profile structure
- [x] 11.4 Write smoke test verifying that a signal matching an exclusion is rejected when content universe is present
- [x] 11.5 Write smoke test verifying graceful fallback when content universe is null
