## 1. Schema and Model

- [x] 1.1 Add `"news"` to `signalLayerSchema` enum in `src/models/schema.ts`
- [x] 1.2 Create `src/models/news-ingestion.ts` with Zod schemas: `newsQuerySchema` (id, userId, queryText, derivedFrom, profileReference, contentHash, active, geographic filters, createdAt), `newsPollStateSchema` (queryId, lastPolledAt, resultCount, consecutiveErrors, lastErrorMessage, nextPollAt), and `newsArticleMetadataSchema` (gdeltDocId, sourceDomain, sourceCountry, language, tonePositive, toneNegative, tonePolarity, toneActivity, toneSelfReference, gkgSource)
- [x] 1.3 Export `news-ingestion` models from `src/models/index.ts`
- [x] 1.4 Add `"news"` to `layersCompleted`/`layersFailed` recognition in orchestrator model if needed

## 2. Database

- [x] 2.1 Add `news_queries` table to `src/db/schema.sql` (id, user_id, query_text, derived_from, profile_reference, content_hash, geographic_filters, active, created_at)
- [x] 2.2 Add `news_poll_state` table to `src/db/schema.sql` (query_id, last_polled_at, result_count, consecutive_errors, last_error_message, next_poll_at)
- [x] 2.3 Create Drizzle migration for the new tables

## 3. Query Derivation

- [x] 3.1 Implement `deriveNewsQueries(userId)` — reads user profile and generates GDELT query records from impress list companies, peer orgs, intelligence goals, industry topics
- [x] 3.2 Implement geographic filter application from profile's `geographicRelevance` field
- [x] 3.3 Implement content-hash-based query deduplication across users
- [x] 3.4 Implement query refresh logic — regenerate queries on profile update, deactivate orphaned queries without deleting

## 4. GDELT DOC API Client

- [x] 4.1 Implement `GdeltDocClient` with method `searchArticles(query, timespan, maxResults)` that calls the GDELT DOC 2.0 API and returns normalized article results
- [x] 4.2 Implement NEAR operator query formatting for company-name + industry-term combinations
- [x] 4.3 Implement sourcecountry filter parameter support
- [x] 4.4 Implement tone metadata extraction from API response (positive, negative, polarity, activity, self-reference)
- [x] 4.5 Implement rate limit detection and configurable cooldown (default 60s)
- [x] 4.6 Implement inter-query delay (default 2s) and max-queries-per-cycle cap (default 50)

## 5. GKG Entity Lookup

- [x] 5.1 Implement `GdeltGkgClient` with methods `lookupOrganization(name)` and `lookupPerson(name)` that query GDELT GKG extracted tables
- [x] 5.2 Implement GKG result normalization into signal format with `gkg_source: true` metadata tag
- [x] 5.3 Implement dedup check against DOC API results to avoid duplicate signals from both sources

## 6. News Ingestion Layer

- [x] 6.1 Implement `pollNewsQueries(cycleId)` — iterates active queries, calls DOC API client, normalizes results into signals with layer "news"
- [x] 6.2 Implement article-to-signal normalization: title, content (summary), sourceUrl, publishedAt, metadata (tone fields, source domain, country, language, GDELT doc ID)
- [x] 6.3 Implement signal deduplication against existing signals (URL match + content hash)
- [x] 6.4 Implement provenance record creation — link each signal to users whose queries matched, with correct trigger reason based on query's `derivedFrom`
- [x] 6.5 Implement poll state updates on success (timestamp, result count, content hash) and failure (error count, backoff)
- [x] 6.6 Implement GKG supplementary lookup pass after DOC API polling (when gkgEnabled config is true)

## 7. Configuration

- [x] 7.1 Define news ingestion config type with defaults: pollIntervalMinutes (1440), maxArticlesPerQuery (25), lookbackHours (24), rateLimitCooldownSeconds (60), interQueryDelayMs (2000), maxQueriesPerCycle (50), gkgEnabled (true)
- [x] 7.2 Load config from environment variables or config file

## 8. Orchestrator Integration

- [x] 8.1 Register news ingestion as a layer in the daily orchestrator's shared ingestion cycle
- [x] 8.2 Call `pollNewsQueries` during the ingestion stage, tracking signal count and layer status in `ingestionCycleState`
- [x] 8.3 Ensure orchestrator error handling treats news layer failures as non-critical (continues with other layers)

## 9. Scoring Agent Updates

- [x] 9.1 Update scoring agent system prompt to describe news-layer signals and GDELT tone metadata availability
- [x] 9.2 Verify news signals flow through existing agent tools (knowledge graph lookup, provenance, peer comparison) without changes

## 10. Testing

- [x] 10.1 Unit tests for query derivation from each profile element type (impress list, peer orgs, intelligence goals, topics)
- [x] 10.2 Unit tests for GDELT DOC API client response parsing and tone extraction
- [x] 10.3 Unit tests for article deduplication logic (URL match, content hash)
- [x] 10.4 Unit tests for poll state management (success update, error backoff, rate limit handling)
- [x] 10.5 Integration test: end-to-end news ingestion cycle with mock GDELT API — verify signals are created with correct layer, metadata, and provenance
