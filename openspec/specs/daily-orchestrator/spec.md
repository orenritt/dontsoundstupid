## Purpose

The daily orchestrator is the main loop that ties all pipeline components together. It schedules and executes the daily pipeline for each user: shared ingestion across the signal pool, then per-user scoring, novelty filtering, briefing composition, and delivery. It tracks pipeline run state for observability and handles errors gracefully with stage-level isolation.

## Requirements

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

### Requirement: Pipeline Run Tracking

The system MUST maintain a complete audit trail of each pipeline run.

#### Scenario: Run state tracking

- **WHEN** a pipeline run begins
- **THEN** the system MUST create a run record with: user ID, run ID, start time, and status "running"
- **AND** MUST update the record as each stage completes or fails

#### Scenario: Stage-level tracking

- **WHEN** a pipeline stage completes
- **THEN** the system MUST record: stage name, start/end time, signals processed count, signals passed count, and any errors
- **AND** MUST record the stage outcome (success, partial-failure, failure)

### Requirement: Pipeline Scheduling

The system MUST schedule pipeline runs based on each user's delivery preferences.

#### Scenario: Time-based scheduling

- **WHEN** a user has configured a preferred delivery time and timezone
- **THEN** the system MUST schedule their pipeline run to complete before the delivery time
- **AND** MUST account for pipeline execution duration when scheduling the start time

#### Scenario: Schedule adjustment

- **WHEN** a user updates their delivery preferences
- **THEN** the system MUST reschedule their next pipeline run accordingly

### Requirement: Error Handling

The system MUST handle failures gracefully at each pipeline stage.

#### Scenario: Stage failure with fallback

- **WHEN** an individual ingestion layer fails
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

### Requirement: T-0 Knowledge Seeding Pipeline

The system MUST run a one-time knowledge seeding pipeline when a user completes onboarding.

#### Scenario: Post-onboarding seeding

- **WHEN** a user completes onboarding
- **THEN** the system MUST trigger the T-0 seeding pipeline: extract profile entities, run AI industry scan, generate embeddings, populate knowledge graph
- **AND** MUST complete seeding before the user's first daily briefing
