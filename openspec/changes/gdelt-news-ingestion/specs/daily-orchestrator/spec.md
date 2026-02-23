## MODIFIED Requirements

### Requirement: Pipeline Execution

The system MUST execute a daily pipeline for each active user that processes signals through all stages.

#### Scenario: Full pipeline execution

- **WHEN** a user's scheduled delivery time arrives
- **THEN** the system MUST execute the pipeline stages in order: ingestion polling, relevance scoring, novelty filtering, briefing composition, delivery
- **AND** MUST track the status of each stage

#### Scenario: Shared ingestion

- **WHEN** multiple users are scheduled for the same time window
- **THEN** the system MUST run ingestion once (shared signal pool) and then score/filter/compose per-user
- **AND** MUST NOT re-ingest signals that were already ingested in the current cycle

#### Scenario: News ingestion layer participation

- **WHEN** the ingestion stage of the pipeline executes
- **THEN** the system MUST include the "news" layer (GDELT-backed news ingestion) alongside syndication, research, events, narrative, and personal-graph layers in the shared ingestion cycle
- **AND** MUST track the news layer's signal count and status in the ingestion cycle state

### Requirement: Error Handling

The system MUST handle failures gracefully at each pipeline stage.

#### Scenario: Stage failure with fallback

- **WHEN** an individual ingestion layer fails (including the news layer)
- **THEN** the system MUST continue with available signals from other layers
- **AND** MUST record the failure for monitoring

#### Scenario: Critical failure

- **WHEN** a critical stage fails (scoring, composition, or delivery)
- **THEN** the system MUST retry with exponential backoff up to a configured maximum
- **AND** MUST alert monitoring if all retries are exhausted

#### Scenario: Partial delivery

- **WHEN** the pipeline produces a briefing but delivery fails
- **THEN** the system MUST queue the briefing for retry delivery
- **AND** MUST NOT re-run the full pipeline
