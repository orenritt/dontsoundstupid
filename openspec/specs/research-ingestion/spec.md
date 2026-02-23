# research-ingestion Specification

## Purpose

Research ingestion is Layer 2 of the signal pipeline, pulling daily deltas from academic and research sources (Semantic Scholar, arXiv, PubMed, preprint servers). Queries are derived from user profiles — intelligence goals, industry topics, context keywords, and followed authors. Results are normalized to a common format and stored as signals with layer "research" and full provenance.

## Requirements

### Requirement: Research Source Management

The system MUST manage a registry of academic/research API sources with per-source configuration.

#### Scenario: Supported research sources

- **WHEN** configuring research ingestion
- **THEN** the system MUST support the following source types: semantic-scholar, arxiv, pubmed, preprint
- **AND** each source MUST have an API endpoint, rate limit configuration, and enabled/disabled status

#### Scenario: Source health tracking

- **WHEN** a research source is polled
- **THEN** the system MUST track consecutive errors and last successful poll time
- **AND** MUST disable sources with repeated failures for review

### Requirement: Profile-Derived Research Queries

The system MUST generate research queries from user profiles to pull relevant academic content.

#### Scenario: Query derivation from profile

- **WHEN** a user profile is created or updated
- **THEN** the system MUST derive research queries from: intelligence goals, industry topics, context keywords, and followed authors
- **AND** each query MUST reference the profile element it was derived from

#### Scenario: Query deduplication

- **WHEN** generating research queries
- **THEN** the system MUST deduplicate queries using content hashing
- **AND** MUST NOT create duplicate queries for the same search intent

#### Scenario: Multi-source query distribution

- **WHEN** a research query is created
- **THEN** the system MUST determine which research sources to query based on the query's topic and source coverage
- **AND** MUST support querying multiple sources for the same query

### Requirement: Daily Delta Ingestion

The system MUST poll research sources on a daily schedule and ingest only new results as signals.

#### Scenario: Scheduled research polling

- **WHEN** a research query's poll interval has elapsed
- **THEN** the system MUST query the research API with date-range filtering to fetch only new results since the last poll
- **AND** MUST store results as signals with layer "research"

#### Scenario: Research result normalization

- **WHEN** a research result is received from any source
- **THEN** the system MUST normalize it to a common format: title, authors, abstract, publication date, citation count, DOI, and source API identifier
- **AND** MUST create a signal with full metadata and provenance tagging

#### Scenario: Poll state tracking

- **WHEN** a research poll completes
- **THEN** the system MUST update the poll state with: last poll timestamp, query content hash, and result count
- **AND** MUST use the poll state to avoid re-fetching already-ingested results

### Requirement: Research Error Handling

The system MUST handle research API failures gracefully without losing state.

#### Scenario: API rate limiting

- **WHEN** a research API returns a rate-limit response
- **THEN** the system MUST back off according to the API's retry-after header or configured default
- **AND** MUST NOT count rate-limit responses as source errors

#### Scenario: Transient API failures

- **WHEN** a research API call fails with a transient error
- **THEN** the system MUST retry with exponential backoff
- **AND** MUST preserve the last successful poll state for resumption
