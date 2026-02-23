## Why

The signal pipeline currently ingests from RSS/Atom feeds (syndication), academic APIs (research), industry events (events), and AI-powered research — but has no dedicated layer for broad real-world news coverage. Users tracking regulatory changes, geopolitical shifts, competitive moves, or industry disruptions depend on whatever their subscribed feeds happen to publish. GDELT's open, real-time global news database fills this gap by providing structured access to worldwide news events, entity mentions, and tone/sentiment data across 100+ languages and thousands of sources — without requiring per-source feed configuration.

## What Changes

- Add a new ingestion layer ("news") backed by GDELT's DOC API and Global Knowledge Graph (GKG) that produces signals from worldwide news matching a user's profile
- Derive GDELT queries automatically from user profile elements: tracked companies (impress list, peer orgs), industry topics, intelligence goals, and geographic relevance
- Normalize GDELT articles and GKG records into the existing signal model with layer "news" and full provenance tagging
- Expose GDELT tone/sentiment metadata on signals so downstream consumers (relevance scoring agent, briefing composer) can reference sentiment shifts
- Register the news ingestion layer with the daily orchestrator as a participant in the shared ingestion cycle

## Capabilities

### New Capabilities
- `news-ingestion`: GDELT-backed news ingestion layer — query derivation from user profiles, polling GDELT DOC API and GKG, normalizing results into the signal store, tone/sentiment enrichment, and poll state tracking with error handling

### Modified Capabilities
- `daily-orchestrator`: Add "news" as a recognized ingestion layer in the shared ingestion cycle so it runs alongside syndication, research, events, and narrative sources
- `relevance-scoring`: The scoring agent gains a new signal layer ("news") in its candidate pool; GDELT tone data can inform momentum/sentiment reasoning

## Impact

- **New dependency**: GDELT DOC API (free, no API key required) and GDELT GKG API
- **Schema changes**: New `signalLayer` enum value "news"; new Zod schemas for GDELT query, poll state, and article metadata; new model file `src/models/news-ingestion.ts`
- **Database**: New tables for news query registry, poll state tracking, and GDELT-specific metadata
- **Pipeline**: The orchestrator's ingestion cycle gains a new layer; the signal store receives signals with layer "news"
- **Scoring agent**: The relevance scoring agent's candidate pool may grow; no tool changes required since "news" signals flow through the existing signal model
