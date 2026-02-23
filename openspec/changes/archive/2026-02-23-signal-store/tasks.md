## 1. Signal Data Model

- [x] 1.1 Create `src/models/signal.ts` with Signal type (id, layer, sourceUrl, title, content, summary, metadata, publishedAt, ingestedAt)
- [x] 1.2 Create SignalLayer enum type for the five ingestion layers
- [x] 1.3 Create SignalDedup type for tracking cross-layer and same-source duplicates
- [x] 1.4 Add Zod validation schemas for signal types in `src/models/schema.ts`
- [x] 1.5 Export new types from `src/models/index.ts`

## 2. Database Schema

- [x] 2.1 Create `src/db/schema.sql` with Postgres + pgvector schema for signals table (columns, vector embedding, indexes)
- [x] 2.2 Add dedup_links table for tracking signal relationships
- [x] 2.3 Add HNSW index on embedding column for fast vector search

## 3. Verify

- [x] 3.1 Run TypeScript compiler — all files compile clean
