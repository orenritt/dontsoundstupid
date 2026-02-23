## Context

The signal store holds signals from six ingestion layers in a shared pool. Each user has a rich profile with identity, context (initiatives, concerns, topics, knowledge gaps, intelligence goals, feedback history), impress list, peer orgs, and delivery preferences. The relevance scoring engine bridges these — it takes candidate signals and a user profile, computes a multi-factor relevance score for each signal, and outputs a ranked, deduplicated batch ready for briefing assembly.

## Goals / Non-Goals

**Goals:**
- Multi-factor scoring with transparent per-factor breakdown
- Six scoring factors: keyword match, semantic similarity, provenance, goal alignment, feedback boost, freshness
- Normalized 0-1 total score with configurable factor weights
- Minimum threshold filtering — only signals above threshold enter briefings
- Freshness decay — exponential decay based on signal age
- Deduplication at scoring time — similar signals grouped, best representative chosen
- Score persistence for audit trail and debugging

**Non-Goals:**
- LLM-based scoring (future enhancement — current approach is deterministic + embedding-based)
- Real-time scoring (batch per briefing generation cycle)
- User-facing score display (scores are internal; briefings show items, not numbers)
- Collaborative filtering across users (future — this is per-user scoring)

## Decisions

### Decision 1: Six discrete scoring factors with configurable weights

Each signal is scored across six independent factors. Each factor produces a raw 0-1 score, which is multiplied by its weight. The total score is the weighted sum normalized to 0-1. This makes scoring transparent — every score has a breakdown showing exactly which factors contributed and how much.

Factors:
- **keyword-match**: Overlap between signal text (title + content) and user's relevance keywords, topics, initiative descriptions
- **semantic-similarity**: Cosine similarity between signal embedding and user profile embedding (derived from user's topics, initiatives, goals)
- **provenance**: Whether signal provenance records exist for this user — signals collected because of this user's profile score higher
- **goal-alignment**: How well signal content aligns with user's active intelligence goals
- **feedback-boost**: Adjustment based on user feedback history — tune-more on related topics increases score, tune-less decreases
- **freshness**: Exponential decay based on signal age — newer signals score higher

### Decision 2: Weighted sum with normalization

Total score = sum(factor.weight * factor.rawScore) / sum(factor.weight). This guarantees a 0-1 range regardless of weight configuration. Individual factor weights are positive numbers (not required to sum to 1).

### Decision 3: Freshness as exponential decay

freshness_score = exp(-decay_rate * age_hours). With a default decay rate, a signal loses ~50% freshness after 24 hours. This is configurable per deployment. The decay rate is stored in ScoringConfig.

### Decision 4: Deduplication at scoring time

After scoring, signals with high semantic similarity (above dedup threshold from signal store) are grouped. The group's highest-scoring signal becomes the representative; others are suppressed. This prevents briefings from containing three articles about the same announcement.

### Decision 5: Persist scores for auditability

Every scoring run persists RelevanceScore records with full factor breakdowns. This enables: debugging why a signal appeared/didn't appear, feedback loop tuning, and historical score analysis.

## Risks / Trade-offs

- **Embedding quality dependency** — Semantic similarity is only as good as the embedding model. Mitigation: embedding model is configurable and can be upgraded independently.
- **Weight tuning** — Default weights may not be optimal for all users. Mitigation: weights are configurable in ScoringConfig, can be personalized per user in future.
- **Feedback cold start** — New users have no feedback history, so feedback-boost factor contributes nothing initially. Mitigation: factor weight of 0 for feedback-boost means it's additive, not required.
- **Score staleness** — Scores are computed at briefing time, not continuously. A signal's score may differ between runs. Mitigation: this is acceptable for daily/periodic briefings; real-time scoring is a non-goal.
