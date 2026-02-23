## Why

Syndication is the universal baseline for signal collection — every company, publication, and blog has some publishable stream. RSS/Atom feeds are cheap, stable, and incremental. They're the "happy path" for ingestion. For sources without RSS, scrape+diff provides a fallback. This layer runs continuously and feeds the shared signal store with raw content from tracked sources.

## What Changes

- Define feed management model: tracked feeds per user profile (derived from peer orgs, impress list companies, industry publications)
- Define RSS/Atom polling logic types: feed subscription, poll schedule, last-fetched tracking
- Define scrape+diff fallback types for non-RSS sources
- Feed items are stored as signals with layer "syndication" and full provenance

## Capabilities

### New Capabilities
- `syndication-ingestion`: RSS/Atom feed polling and scrape+diff fallback for continuous signal collection from tracked sources

## Impact

- New feed management and ingestion types
- New DB tables for feed subscriptions and poll state
- Feeds derived from user profiles: peer org domains, impress list company blogs, industry publications
