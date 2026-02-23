## Why

All five ingestion layers (syndication, research, narrative, events, personal graph) need somewhere to put their signals. Without a universal signal store, each layer would have its own storage, deduplication, and query pattern — making it impossible for the briefing composer to work against a unified view. The signal store is the shared foundation that all ingestion feeds into and the briefing engine reads from. It needs to support both structured metadata queries and semantic vector search so an LLM can efficiently find and rank relevant content.

## What Changes

- Define a universal Signal data model that works across all five ingestion layers
- Define the Postgres + pgvector schema for signal storage with vector embeddings
- Support deduplication across layers (same announcement from RSS and narrative monitoring)
- Tag every signal with source layer, timestamp, content, embedding, and structured metadata
- Signals are a shared pool — all users' ingestion feeds the same store; relevance scoring is per-user at query time

## Capabilities

### New Capabilities
- `signal-store`: Universal signal storage with structured metadata, vector embeddings, deduplication, and cross-layer querying

## Impact

- New signal data model and TypeScript types
- New Postgres/pgvector schema definition
- Foundation dependency for all ingestion layers, relevance scoring, and briefing composition
- Dependencies: Postgres, pgvector extension, embedding model (OpenAI embeddings or similar)
