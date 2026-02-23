## Context

Every ingestion layer (syndication, research, narrative, events, personal graph) produces signals that need to be stored, deduplicated, embedded, and queried. The signal store is the shared foundation — a single Postgres database with pgvector for semantic search. All users share the same signal pool; relevance is computed per-user at query time.

## Goals / Non-Goals

**Goals:**
- Universal signal data model that works across all five layers
- Postgres + pgvector schema with vector embeddings for semantic search
- Cross-layer and same-source deduplication
- Efficient querying by date, layer, metadata, and semantic similarity
- TypeScript types and Zod schemas matching the DB schema

**Non-Goals:**
- Implementing actual ingestion logic (that's per-layer changes)
- Relevance scoring algorithm (separate change)
- Briefing composition (separate change)
- Database deployment/infrastructure (schema definition only)

## Decisions

### Decision 1: Postgres + pgvector

Single database for everything — structured metadata in regular columns, vector embeddings in pgvector columns. This avoids the operational complexity of a separate vector DB while supporting both SQL queries and semantic search. Postgres is mature, well-tooled, and pgvector performance is sufficient for our scale. Alternative: Pinecone/Weaviate — rejected for MVP due to added infrastructure complexity and cost.

### Decision 2: Embedding model via OpenAI text-embedding-3-small

Use OpenAI's embedding API for generating signal embeddings. text-embedding-3-small is cheap ($0.02/1M tokens), fast, and produces 1536-dimension vectors that work well with pgvector. We store the embedding model identifier alongside each vector so we can migrate models later. Alternative: local embedding model — possible future optimization but adds infrastructure.

### Decision 3: Deduplication via content hash + semantic similarity

Two-stage dedup: (1) exact URL match catches same-source duplicates immediately, (2) semantic similarity above a configurable threshold (e.g., 0.92 cosine similarity) catches cross-layer duplicates. Near-duplicates are linked rather than merged — we keep both records but mark them as related, preserving the fact that multiple layers surfaced the same signal (which is itself a relevance indicator).

### Decision 4: Signals are immutable after ingestion

Once a signal is stored, it doesn't change. If the source content updates, a new signal is created and linked to the original. This keeps the store append-friendly and makes it easy to reason about what was available at briefing time. Metadata (like dedup links) can be added after ingestion.

### Decision 5: Layer-specific metadata via JSONB column

Rather than separate tables per layer, use a single signals table with a JSONB metadata column for layer-specific fields. This keeps the schema simple while allowing each layer to store its own structured data. The shared columns (id, layer, url, title, content, embedding, timestamps) cover the universal fields.

## Risks / Trade-offs

- **Embedding cost** — At scale, embedding every signal adds cost. Mitigation: text-embedding-3-small is cheap; batch embedding; only embed signals that pass basic relevance pre-filters.
- **pgvector performance at scale** — Vector search slows with millions of rows. Mitigation: partition by date (only search recent signals for daily briefings), use IVFFlat or HNSW indexes.
- **Dedup threshold tuning** — Too aggressive dedup misses distinct signals; too loose creates noise. Mitigation: start conservative (0.92), tune based on observed duplicates, allow manual override.
