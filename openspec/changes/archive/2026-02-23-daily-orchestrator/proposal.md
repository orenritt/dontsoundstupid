## Why

All the individual pipeline components exist (ingestion layers, signal store, relevance scoring, novelty gating, briefing composer, delivery) but nothing ties them together. The orchestrator is the "main loop" that runs the daily pipeline for each user: ingest signals, score them, filter for novelty, compose the briefing, and deliver it at the user's preferred time.

## What Changes

- Define the daily pipeline stages and their execution order
- Define pipeline run state tracking (per-user, per-run)
- Define per-user scheduling based on delivery preferences
- Define error handling, retry logic, and partial failure recovery
- Define T-0 knowledge seeding as a one-time pipeline triggered after onboarding

## Capabilities

### New Capabilities
- `daily-orchestrator`: Scheduled daily pipeline that orchestrates ingestion, scoring, novelty gating, composition, and delivery for each user

## Impact

- New orchestrator types for pipeline runs, stage tracking, and scheduling
- New DB tables for pipeline run history
- Connects all existing components into a coherent daily flow
