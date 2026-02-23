## 1. Research Ingestion Model

- [ ] 1.1 Create `src/models/research-ingestion.ts` with: ResearchSource (type, API config, status), ResearchQuery (derived from profile, content hash), ResearchResult (normalized paper metadata), ResearchPollState (last polled, query hash, result count)
- [ ] 1.2 Add Zod schemas for research ingestion types in `src/models/schema.ts`
- [ ] 1.3 Export new types from `src/models/index.ts`

## 2. Database Schema

- [ ] 2.1 Add research_sources table to `src/db/schema.sql`
- [ ] 2.2 Add research_queries table (profile-derived queries)
- [ ] 2.3 Add research_poll_state table for tracking last-polled state

## 3. Verify

- [ ] 3.1 Run TypeScript compiler — all files compile clean
