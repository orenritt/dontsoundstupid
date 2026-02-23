## Context

Research ingestion is Layer 2 of the signal pipeline, sitting alongside syndication (Layer 1). While syndication covers RSS/Atom feeds from company blogs and news sites, research ingestion taps academic APIs to surface papers, preprints, and studies. Both layers feed into the shared signal store with full provenance.

## Goals / Non-Goals

**Goals:**
- Research source registry with API configuration per source type
- Profile-derived query generation (topics, keywords, authors)
- Daily delta polling with date-range filtering
- Normalized research result format across all source APIs
- Poll state tracking for incremental ingestion

**Non-Goals:**
- Full-text PDF extraction (future enhancement)
- Citation graph analysis / related paper discovery
- Real-time streaming from research APIs (daily polling only for MVP)
- Automated query refinement based on result quality

## Decisions

### Decision 1: Four source types for MVP

Support Semantic Scholar, arXiv, PubMed, and a generic preprint type. Each has a different API but all return similar paper metadata. The source type determines API-specific configuration (endpoint, auth, rate limits).

### Decision 2: Queries derived from profile, not manually created

Research queries are generated from user profile elements: intelligence goals map to topic searches, context keywords become keyword queries, and explicit author follows become author queries. Users don't manually manage research queries — the system derives them.

### Decision 3: Content hash for query deduplication

Each query gets a content hash computed from its normalized search terms. This prevents duplicate queries when multiple profile elements generate the same search intent.

### Decision 4: Poll state per query-source pair

Track poll state independently for each (query, source) combination. This allows different sources to be polled at different rates and recover independently from failures.

## Risks / Trade-offs

- **API rate limits** — Academic APIs have strict rate limits (especially Semantic Scholar free tier). Mitigation: configure per-source rate limits and distribute queries across the day.
- **Result relevance** — Broad topic queries can return hundreds of papers. Mitigation: use citation count and recency as pre-filters; let the relevance scoring layer handle final ranking.
- **API instability** — Academic APIs change without notice. Mitigation: abstract behind source-type config so API changes only affect configuration, not the ingestion model.
