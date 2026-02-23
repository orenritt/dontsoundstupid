## Context

The signal pipeline has four ingestion layers today: syndication (RSS/Atom feeds), research (academic APIs), events (conference platforms), and AI research (LLM-generated). None provide broad real-world news coverage. Users tracking regulatory shifts, competitive moves, or geopolitical events rely on whatever their subscribed feeds happen to publish.

GDELT (Global Database of Events, Language, and Tone) is a free, open platform that monitors worldwide news from thousands of sources in 100+ languages, updating every 15 minutes. It provides two relevant APIs:

- **DOC 2.0 API** — full-text search across global news articles. Supports keyword queries, NEAR/REPEAT operators, time ranges, tone charts, and article retrieval. No API key required, rate-limited by IP.
- **GKG (Global Knowledge Graph)** — extracted entity tables (organizations, persons, themes, locations) with tone/sentiment metadata. Available via GDELT Cloud with extracted tables for organizations, persons, themes, and locations. Rolling 30-day window with 15-minute update frequency.

The existing signal model (`signalSchema` with layer enum, provenance, dedup) already supports multiple ingestion layers. Adding "news" as a new layer follows the same pattern established by syndication and research ingestion.

## Goals / Non-Goals

**Goals:**
- Provide a "what's happening in the world" signal layer that surfaces news relevant to each user's profile without requiring per-source feed setup
- Derive GDELT queries automatically from existing profile elements (impress list companies, peer orgs, industry topics, intelligence goals, geographic relevance)
- Normalize GDELT results into the existing signal model so they flow through scoring, novelty filtering, and composition unchanged
- Surface tone/sentiment metadata so the scoring agent can reason about sentiment shifts ("tone around X is turning negative")
- Integrate with the daily orchestrator's shared ingestion cycle

**Non-Goals:**
- Real-time or streaming ingestion — this layer polls on the same daily cadence as other layers
- Replacing syndication ingestion — RSS feeds provide depth on specific orgs; GDELT provides breadth across global news
- Full GKG graph analysis — we use GKG extracted tables for entity-level lookups, not full graph traversal
- GDELT BigQuery integration — the free REST APIs are sufficient for our volume; BigQuery adds cost and complexity
- Geospatial visualization — we ingest location metadata but don't render maps

## Decisions

### Decision 1: Use DOC 2.0 API as primary, GKG extracted tables as enrichment

The DOC 2.0 API provides article-level search with full text, tone data, and source URLs — this maps directly to our signal model. The GKG extracted tables (organizations, persons, themes) serve as a secondary lookup: when a user tracks specific companies or people, we can query the GKG org/person tables to find mentions that a keyword search might miss.

**Alternative considered:** Using GKG as the primary source. Rejected because GKG records are entity extractions, not full articles — they lack the narrative context needed for briefing composition. DOC API returns actual article summaries.

### Decision 2: Profile-derived query generation

Queries are derived from five profile elements, each mapped to a GDELT query pattern:

| Profile element | Query strategy |
|---|---|
| Impress list companies | Company name as keyword, optionally with NEAR operator for industry terms |
| Peer organizations | Organization name queries |
| Intelligence goals | Goal detail text as keyword phrases |
| Industry topics | Topic keywords, combined with NEAR for specificity |
| Geographic relevance | Sourcecountry filter parameter on DOC API |

Each derived query stores its `derivedFrom` reference for provenance. Queries are deduplicated by content hash to avoid redundant API calls when multiple users share overlapping interests.

**Alternative considered:** A single broad query per user combining all keywords. Rejected because GDELT queries with many OR-ed terms return noisy results; targeted queries per profile element yield higher precision and better provenance attribution.

### Decision 3: Daily polling with 24-hour lookback

The news layer polls once per ingestion cycle (daily) with a 24-hour lookback window using the DOC API's TIMESPAN parameter. This aligns with other ingestion layers and avoids hammering GDELT's rate limits.

For each query, we fetch the top N articles (configurable, default 25) sorted by relevance. Articles are deduplicated against previously ingested signals using URL-based matching and content hash comparison.

**Alternative considered:** More frequent polling (every 15 minutes to match GDELT's update cadence). Rejected because the briefing is daily — more frequent polling adds complexity and API load without improving the user-facing output.

### Decision 4: Tone metadata stored in signal metadata field

GDELT returns article-level tone scores (positive/negative/polarity/activity/self-reference). These are stored in the signal's existing `metadata` field as key-value pairs (`tone_positive`, `tone_negative`, `tone_polarity`). No schema changes to the signal model are needed.

The scoring agent can reference tone data when it inspects candidate signals. The briefing composer can use tone shifts as a narrative hook ("sentiment around X is shifting").

**Alternative considered:** A dedicated tone schema with typed fields. Rejected because tone is supplementary metadata, not a core signal attribute. The flexible `metadata` record field is designed for this.

### Decision 5: New model file, shared signal store

News ingestion gets its own model file (`src/models/news-ingestion.ts`) with Zod schemas for GDELT-specific types: news query registry, poll state, and article metadata. Normalized signals go into the existing signal store with `layer: "news"`.

This follows the same pattern as `src/models/research-ingestion.ts` and `src/models/events.ts`.

### Decision 6: Signal layer enum extension

Add `"news"` to the existing `signalLayerSchema` enum in `src/models/schema.ts`. This is a non-breaking additive change — existing consumers that switch on layer values will simply not match "news" until updated.

## Risks / Trade-offs

**GDELT API availability** — GDELT is a free academic project, not a commercial SaaS with SLAs. Outages or rate limiting could interrupt news ingestion.
→ Mitigation: The orchestrator already handles layer-level failures gracefully (continues with other layers). Poll state tracks consecutive errors with exponential backoff. News is additive — a missed day degrades but doesn't break briefings.

**Query precision vs. recall** — Profile-derived keyword queries may return irrelevant articles (e.g., "Apple" the company vs. apple the fruit) or miss relevant ones.
→ Mitigation: Use NEAR operator to pair entity names with industry context terms. The scoring agent downstream filters aggressively — low-relevance signals won't make it into briefings. Over time, user feedback (tune-less, not-novel) refines what surfaces.

**Rate limiting** — GDELT DOC API is rate-limited by IP. With many users deriving many queries, we could hit limits.
→ Mitigation: Deduplicate queries across users (same content hash = one API call). Batch queries within the ingestion window. Start with conservative per-query delays (1-2 seconds between requests). Monitor and adjust.

**30-day GKG window** — GKG extracted tables only cover 30 rolling days. Historical analysis beyond that window isn't possible.
→ Mitigation: Acceptable for our use case — we care about current news, not historical archives. Signals are persisted in our signal store regardless of GDELT's retention.

**Volume management** — GDELT covers thousands of sources worldwide. Even targeted queries could return high volumes for popular topics.
→ Mitigation: Cap results per query (default 25 articles). Dedup against existing signals. The scoring agent selects only top-N for briefings regardless of candidate pool size.
