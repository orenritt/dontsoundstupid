## Context

Syndication is the always-on baseline ingestion layer. Every domain has some publishable stream — RSS/Atom is the cheap, stable happy path. Scrape+diff is the fallback for sources that don't publish feeds. Both feed into the shared signal store.

## Goals / Non-Goals

**Goals:**
- Feed registry with auto-discovery from user profiles
- RSS/Atom polling with incremental ingestion (only new items)
- Scrape+diff fallback for feedless sources
- Provenance tagging for all ingested signals
- Error handling with exponential backoff

**Non-Goals:**
- Full-text extraction / readability parsing (future enhancement)
- Feed recommendation ("you might also want to follow...") 
- Real-time / webhook-based feed updates (poll-based only for MVP)

## Decisions

### Decision 1: Single feed registry, multi-user subscription

Feeds are registered once in a shared registry. Multiple users can be subscribed to the same feed. When a feed is polled, the resulting signals are tagged with provenance for all subscribed users. This avoids redundant polling.

### Decision 2: Poll interval based on feed update frequency

Start with a default 1-hour poll interval. Track how often each feed actually publishes new items and adjust the interval accordingly (fast feeds = more frequent polling, slow feeds = less). This is an optimization for later; fixed interval for MVP.

### Decision 3: Scrape+diff uses content hashing

For scrape targets, store a content hash of the page on each fetch. Compare hashes to detect changes. When a change is detected, use text diffing to extract new entries. This is simple and avoids false positives from layout changes.

### Decision 4: Feed discovery via standard conventions

Try well-known feed paths (/feed, /rss, /atom.xml, /blog/feed) and HTML link rel="alternate" tags. If none found, fall back to scrape+diff. No complex feed discovery heuristics for MVP.

## Risks / Trade-offs

- **Scrape quality** — HTML parsing is fragile and varies wildly across sites. Mitigation: start with RSS-only, add scrape+diff for high-value sources manually.
- **Feed volume** — Popular industry feeds can produce hundreds of items per day. Mitigation: pre-filter by keyword relevance before creating signals; use dedup against existing signals.
