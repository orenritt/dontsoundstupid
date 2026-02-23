## Context

Syndication and research layers produce raw signals — individual articles, research responses, feed items. The narrative layer sits above them and uses LLM analysis to detect patterns across many signals: emerging frames, shifting language, and new jargon. This is Layer 3 in the signal generation pipeline.

## Goals / Non-Goals

**Goals:**
- Narrative source type model (news APIs, social trends, search trends)
- Frame detection with momentum scoring and multi-source adoption tracking
- Term burst detection with frequency deltas and adoption velocity
- Periodic LLM-powered analysis snapshots
- Configuration for LLM provider, analysis frequency, and thresholds

**Non-Goals:**
- Actual LLM integration / prompt engineering (future — this defines the data model)
- Real-time streaming analysis (batch/periodic for MVP)
- Sentiment analysis (separate concern, may layer on top later)
- UI for narrative visualization (backend model only)

## Decisions

### Decision 1: Separate tables for frames and term bursts

Narrative frames and term bursts are conceptually different entities with different lifecycles. Frames track thematic patterns across sources; term bursts track specific terminology adoption. Keeping them in separate tables allows independent querying and indexing.

### Decision 2: Momentum as a computed score, not a history

Store a single momentum score on each frame rather than a full time-series history. The score is recomputed on each analysis cycle based on adoption rate changes. This keeps the model simple for MVP. Time-series tracking can be added later if needed.

### Decision 3: NarrativeAnalysis as a snapshot model (not persisted)

NarrativeAnalysis represents a point-in-time output of the analysis cycle. It contains frames, term bursts, and metadata. Individual frames and term bursts are persisted to DB, but the analysis snapshot itself is a TypeScript-only model for pipeline consumption — no dedicated DB table.

### Decision 4: Configuration as a TypeScript type

NarrativeConfig defines LLM provider, analysis frequency, and thresholds. It's a configuration type, not a DB entity. Configuration is loaded from environment or config files at runtime.

## Risks / Trade-offs

- **LLM cost** — Running analysis over large volumes of signals can be expensive. Mitigation: batch signals by topic area, use configurable analysis frequency, and set minimum signal count before triggering analysis.
- **Frame quality** — LLM-detected frames may be noisy or overlapping. Mitigation: require minimum multi-source adoption before surfacing; allow downstream dedup.
- **Stale momentum** — Momentum scores only update on analysis cycles. Mitigation: configurable frequency; default to daily for MVP.
