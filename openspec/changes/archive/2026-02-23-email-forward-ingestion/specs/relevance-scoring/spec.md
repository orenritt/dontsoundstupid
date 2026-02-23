## MODIFIED Requirements

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
- **AND** signals with provenance type `"user-curated"` MUST receive a higher provenance score than signals with standard feed-derived provenance

#### Scenario: User-curated provenance elevation

- **WHEN** the provenance factor is computed for a signal with provenance type `"user-curated"`
- **THEN** the system MUST assign the maximum provenance raw score (1.0) for that signal
- **AND** MUST include the user's annotation text in the score breakdown metadata for downstream attribution

#### Scenario: Goal alignment scoring

- **WHEN** the goal-alignment factor is computed
- **THEN** the system MUST evaluate how well the signal content aligns with the user's active intelligence goals (industry-trends, new-jargon, new-entrants, best-practices, research, regulatory, competitive-intelligence, network-intelligence, custom)
- **AND** inactive goals MUST NOT contribute to the score

#### Scenario: Feedback adjustment scoring

- **WHEN** the feedback-boost factor is computed
- **THEN** the system MUST consult the user's feedback history (tune-more, tune-less signals)
- **AND** MUST apply learned relevance adjustments: topics the user tuned-more MUST increase the score, topics the user tuned-less MUST decrease the score
