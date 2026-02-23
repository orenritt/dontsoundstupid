## 1. Knowledge Graph Model

- [ ] 1.1 Create `src/models/knowledge-graph.ts` with: KnowledgeEntity, KnowledgeEdge, ExposureRecord, NoveltyScore, ZeroBriefingResponse types
- [ ] 1.2 Add Zod schemas for knowledge graph types in `src/models/schema.ts`
- [ ] 1.3 Export new types from `src/models/index.ts`

## 2. Database Schema

- [ ] 2.1 Add knowledge_entities table to `src/db/schema.sql` with embedding HNSW index
- [ ] 2.2 Add knowledge_edges table
- [ ] 2.3 Add exposure_records table

## 3. Relevance Scoring Integration

- [ ] 3.1 Add "novelty" to ScoringFactorName in `src/models/relevance.ts`
- [ ] 3.2 Add noveltyMinimumThreshold to ScoringConfig

## 4. Composer Integration

- [ ] 4.1 Add novel elements context to BriefingPrompt in `src/models/composer.ts`
- [ ] 4.2 Add zero-briefing case to ComposedBriefing

## 5. Feedback Extension

- [ ] 5.1 Add NotNovelFeedback type and update FeedbackSignal union in `src/models/feedback.ts`
- [ ] 5.2 Update Zod schema for new feedback type

## 6. Verify

- [ ] 6.1 Run TypeScript compiler — all files compile clean
