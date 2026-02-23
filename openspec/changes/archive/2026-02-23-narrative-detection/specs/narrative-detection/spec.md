## ADDED Requirements

### Requirement: Narrative Source Management

The system MUST support multiple narrative source types for monitoring large-scale coverage.

#### Scenario: News API source

- **WHEN** a narrative source of type "news-api" is configured
- **THEN** the system MUST poll the configured news API for articles matching tracked topic areas
- **AND** MUST pass article batches to the LLM for frame and term analysis

#### Scenario: Social trends source

- **WHEN** a narrative source of type "social-trends" is configured
- **THEN** the system MUST ingest trending topic data from social platforms
- **AND** MUST correlate social trends with detected narrative frames

#### Scenario: Search trends source

- **WHEN** a narrative source of type "search-trends" is configured
- **THEN** the system MUST ingest search trend data to identify rising queries and topic interest
- **AND** MUST feed search trend signals into narrative frame detection

### Requirement: Narrative Frame Detection

The system MUST detect emerging narrative frames from aggregated coverage using LLM analysis.

#### Scenario: Frame identification

- **WHEN** the system runs a narrative analysis cycle
- **THEN** the system MUST use an LLM to identify distinct frames/themes across recent coverage
- **AND** MUST assign each frame a title, description, first-seen timestamp, and momentum score

#### Scenario: Multi-source adoption tracking

- **WHEN** a narrative frame is detected across multiple sources
- **THEN** the system MUST track the adoption count (number of distinct sources using this frame)
- **AND** MUST link the frame to the contributing signals

#### Scenario: Momentum scoring

- **WHEN** a narrative frame is tracked over time
- **THEN** the system MUST compute a momentum score reflecting growth rate of adoption
- **AND** MUST flag frames with rapidly increasing momentum as emerging narratives

### Requirement: Term Burst Detection

The system MUST detect emerging terms and jargon that are gaining adoption velocity.

#### Scenario: New term detection

- **WHEN** the system analyzes coverage for a topic area
- **THEN** the system MUST identify terms with significant frequency increases (frequency delta)
- **AND** MUST record the first appearance timestamp and adoption velocity

#### Scenario: Context tracking

- **WHEN** a term burst is detected
- **THEN** the system MUST collect context examples showing how the term is being used
- **AND** MUST track which sources have adopted the term

### Requirement: Periodic Analysis

The system MUST run narrative analysis on a configurable schedule.

#### Scenario: Analysis cycle

- **WHEN** the configured analysis interval has elapsed for a topic area
- **THEN** the system MUST gather recent signals, run LLM analysis, and produce a NarrativeAnalysis snapshot
- **AND** MUST record the LLM model used and analysis timestamp

#### Scenario: Minimum threshold filtering

- **WHEN** narrative frames or term bursts are detected
- **THEN** the system MUST filter out frames below the configured minimum adoption threshold
- **AND** MUST only surface frames that meet the threshold to downstream consumers
