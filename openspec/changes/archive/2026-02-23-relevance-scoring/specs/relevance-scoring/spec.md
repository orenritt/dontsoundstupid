# relevance-scoring Delta Spec

## ADDED Requirements

### Requirement: Multi-Factor Relevance Scoring

The system MUST score every candidate signal against a user's profile using multiple independent scoring factors.

#### Scenario: Signal scored with all factors

- **WHEN** a signal is evaluated for a user's briefing
- **THEN** the system MUST compute independent scores for each of these factors: keyword-match, semantic-similarity, provenance, goal-alignment, feedback-boost, freshness
- **AND** each factor MUST produce a raw score in the 0-1 range
- **AND** each factor MUST be multiplied by its configured weight to produce a weighted score

#### Scenario: Keyword match scoring

- **WHEN** the keyword-match factor is computed
- **THEN** the system MUST compare signal text (title + content) against the user's relevance keywords, topics, and initiative descriptions
- **AND** MUST produce a score proportional to the degree of overlap

#### Scenario: Semantic similarity scoring

- **WHEN** the semantic-similarity factor is computed
- **THEN** the system MUST compute cosine similarity between the signal's embedding vector and a user profile embedding derived from the user's topics, initiatives, and intelligence goals
- **AND** MUST use the stored signal embedding from the signal store

#### Scenario: Provenance scoring

- **WHEN** the provenance factor is computed
- **THEN** the system MUST check whether signal provenance records exist linking the signal to the target user
- **AND** signals with direct provenance for the user MUST receive a higher provenance score than signals without provenance

#### Scenario: Goal alignment scoring

- **WHEN** the goal-alignment factor is computed
- **THEN** the system MUST evaluate how well the signal content aligns with the user's active intelligence goals (industry-trends, new-jargon, new-entrants, best-practices, research, regulatory, competitive-intelligence, network-intelligence, custom)
- **AND** inactive goals MUST NOT contribute to the score

#### Scenario: Feedback adjustment scoring

- **WHEN** the feedback-boost factor is computed
- **THEN** the system MUST consult the user's feedback history (tune-more, tune-less signals)
- **AND** MUST apply learned relevance adjustments: topics the user tuned-more MUST increase the score, topics the user tuned-less MUST decrease the score

### Requirement: Score Normalization

The system MUST normalize the total relevance score to a 0-1 range.

#### Scenario: Weighted sum normalization

- **WHEN** all factor scores are computed for a signal
- **THEN** the system MUST calculate total score as: sum(factor.weight × factor.rawScore) / sum(factor.weight)
- **AND** the resulting total score MUST be in the range [0, 1] regardless of weight configuration

### Requirement: Minimum Score Threshold

The system MUST enforce a configurable minimum score threshold for briefing inclusion.

#### Scenario: Signal above threshold

- **WHEN** a signal's total relevance score is at or above the configured minimum threshold
- **THEN** the system MUST include it in the candidate set for briefing assembly

#### Scenario: Signal below threshold

- **WHEN** a signal's total relevance score is below the configured minimum threshold
- **THEN** the system MUST exclude it from the briefing candidate set
- **AND** MUST still persist the score for audit purposes

### Requirement: Score Breakdown Transparency

The system MUST provide a per-factor breakdown of every relevance score.

#### Scenario: Score breakdown recorded

- **WHEN** a relevance score is computed
- **THEN** the system MUST record: the factor name, the factor weight, the raw score (0-1), and the weighted score (weight × rawScore)
- **AND** all factors MUST be present in the breakdown even if their raw score is 0

### Requirement: Freshness Decay

The system MUST apply freshness decay so older signals score lower.

#### Scenario: Freshness computed from signal age

- **WHEN** the freshness factor is computed
- **THEN** the system MUST calculate freshness as an exponential decay function: score = exp(-decayRate × ageInHours)
- **AND** the decay rate MUST be configurable in the ScoringConfig

#### Scenario: Very old signals approach zero freshness

- **WHEN** a signal is significantly older than the decay half-life
- **THEN** the freshness score MUST approach 0
- **AND** the signal MAY still score above threshold if other factors are strong enough

### Requirement: Deduplication at Scoring Time

The system MUST group similar signals at scoring time to prevent briefing redundancy.

#### Scenario: Duplicate signals grouped

- **WHEN** multiple signals have been identified as near-duplicates (via the signal store's dedup links)
- **THEN** the system MUST group them and select the highest-scoring signal as the representative
- **AND** MUST suppress the other signals in the group from the briefing candidate set

### Requirement: Scoring Configuration

The system MUST support configurable scoring parameters.

#### Scenario: Scoring config applied

- **WHEN** a scoring run is initiated
- **THEN** the system MUST use the configured factor weights, minimum threshold, freshness decay rate, and maximum signals per briefing
- **AND** MUST enforce the max signals limit on the final scored batch

### Requirement: Scored Signal Batch Output

The system MUST output a structured batch result from each scoring run.

#### Scenario: Batch output structured

- **WHEN** a scoring run completes for a user
- **THEN** the system MUST produce a ScoredSignalBatch containing: user ID, scoring run timestamp, all scored signals (signal + score) partitioned into above-threshold and below-threshold groups
