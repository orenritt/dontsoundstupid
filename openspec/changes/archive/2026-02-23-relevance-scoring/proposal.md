## Why

Users need a personalized briefing drawn from a shared signal pool across six ingestion layers. Today signals are stored but there's no mechanism to decide which signals matter most for a given user. The Relevance Scoring Engine evaluates every candidate signal against the user's full profile — keywords, embeddings, provenance, intelligence goals, feedback history — and produces a normalized 0-1 score with a transparent breakdown. This is the critical bridge between raw signals and curated briefings: without scoring, briefings are either everything (noise) or hand-picked (doesn't scale).

## What Changes

- Define multi-factor scoring model: keyword match, semantic similarity (cosine distance on embeddings), provenance weight, intelligence goal alignment, feedback adjustment (tune-more / tune-less), freshness decay
- Define ScoringConfig: per-factor weights, minimum threshold, freshness decay rate, max signals per briefing
- Define ScoredSignalBatch: the output of a scoring run — all scored signals with above/below threshold partitioning
- Score normalization to 0-1 range with transparent factor-level breakdown
- Deduplication at scoring time — similar signals grouped, best-scoring representative surfaces
- Freshness decay — older signals receive progressively lower scores based on configurable half-life

## Capabilities

### New Capabilities
- `relevance-scoring`: Multi-factor relevance scoring of signals against user profiles with transparent score breakdown, freshness decay, and deduplication

## Impact

- New relevance scoring types (ScoringFactor, RelevanceScore, ScoringConfig, ScoredSignalBatch)
- New DB table for persisted relevance scores
- New Zod validation schemas for all relevance types
- Scoring engine consumes: signal store (signals + embeddings), signal provenance, user profile (keywords, goals, feedback history)
