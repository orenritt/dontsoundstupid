## Why

Signals in the shared pool currently have no record of *why* they were collected or *who* they were collected for. A blog post crawled because User 1 follows Acme Corp is highly relevant to User 1 — but without provenance, the relevance scoring engine has to rediscover that from scratch. Provenance also enables a future "similar users" feature: signals that were important to User 1 can be pre-scored as likely relevant to users with similar profiles, without re-crawling.

## What Changes

- Add a provenance model to the signal store — every signal records who/what triggered its ingestion
- A single signal can have multiple provenance records (crawled for User 1's peer org, also matched User 3's RSS feed)
- Provenance tracks: triggering user, trigger reason (followed org, peer org, impress list person, intelligence goal, etc.), and the specific profile element that caused the ingestion
- The relevance scoring engine can use provenance as a strong pre-signal for user relevance

## Capabilities

### New Capabilities

### Modified Capabilities
- `signal-store`: Add provenance tracking — each signal records which users triggered its collection and why

## Impact

- New provenance types in `src/models/signal.ts`
- New provenance table in `src/db/schema.sql`
- Updated Zod schemas
- Foundation for future "similar users" signal sharing
