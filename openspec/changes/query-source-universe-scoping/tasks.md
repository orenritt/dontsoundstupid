## 1. Query Derivation Scoping

- [x] 1.1 Modify `deriveNewsQueries` in `query-derivation.ts` to load the content universe once and pass it to all derivation functions
- [x] 1.2 Modify `deriveFromImpressList` to accept content universe and scope queries: combine company name with top 3 coreTopics as OR group when universe exists, preserve current behavior when null
- [x] 1.3 Modify `deriveFromPeerOrgs` to accept content universe and scope queries: combine org name with top 3 coreTopics as OR group when universe exists, preserve current behavior when null
- [x] 1.4 Modify `deriveFromIntelligenceGoals` to accept content universe and scope queries: combine goal detail with universe definition context when universe exists, preserve current behavior when null

## 2. Post-Fetch Relevance Filter

- [x] 2.1 Create `matchesContentUniverse(title: string, summary: string, universe: ContentUniverse): boolean` utility function in `ingest.ts` — case-insensitive substring check against coreTopics and exclusions
- [x] 2.2 Integrate the filter into `pollNewsQueries` — after fetching articles, before inserting signals, drop articles that fail the content universe check (load universe once per user at cycle start)
- [x] 2.3 Add `filteredOut` count to ingestion result and log how many articles were dropped by the filter

## 3. Testing

- [x] 3.1 Write unit tests for `matchesContentUniverse` — coreTopic match passes, exclusion-only match rejects, both match passes, no match rejects, null universe passes all
- [x] 3.2 Query derivation scoping verified via integration — functions accept content universe and build scoped queries when present, fallback to unscoped when null
