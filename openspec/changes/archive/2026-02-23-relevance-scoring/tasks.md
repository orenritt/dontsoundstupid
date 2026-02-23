## 1. Relevance Scoring Types Model

- [ ] 1.1 Create `src/models/relevance.ts` with: ScoringFactorName (enum of six factors), ScoringFactor (factor name, weight, raw score, weighted score), RelevanceScore (signal ID, user ID, total score 0-1, factors breakdown, scored at), ScoringConfig (factor weights, minimum threshold, freshness decay rate, max signals per briefing), ScoredSignalBatch (user ID, scoring run timestamp, scored signals partitioned by threshold)
- [ ] 1.2 Add Zod schemas for all relevance scoring types in `src/models/schema.ts`
- [ ] 1.3 Export new types from `src/models/index.ts`

## 2. Database Schema

- [ ] 2.1 Add relevance_scores table to `src/db/schema.sql` with signal_id, user_id, total_score, factors (JSONB), scored_at, and indexes

## 3. Verify

- [ ] 3.1 Run TypeScript compiler — all files compile clean
