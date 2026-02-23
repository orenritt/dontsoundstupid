## Purpose

News ingestion is a signal layer backed by GDELT's DOC 2.0 API and Global Knowledge Graph (GKG) extracted tables. It derives search queries from user profiles — impress list companies, peer organizations, intelligence goals, industry topics, and geographic relevance — and polls GDELT daily for matching worldwide news articles. Results are normalized into the signal store with layer "news", tone/sentiment metadata, and full provenance tagging.

## ADDED Requirements

### Requirement: News Query Derivation

The system MUST automatically derive GDELT queries from user profile elements.

#### Scenario: Queries from impress list companies

- **WHEN** a user profile contains impress list contacts with associated companies
- **THEN** the system MUST create news queries using each company name as a keyword
- **AND** MUST set the `derivedFrom` field to "impress-list" with the company name as profile reference

#### Scenario: Queries from peer organizations

- **WHEN** a user profile contains confirmed peer organizations
- **THEN** the system MUST create news queries using each peer organization name as a keyword
- **AND** MUST set the `derivedFrom` field to "peer-org" with the organization name as profile reference

#### Scenario: Queries from intelligence goals

- **WHEN** a user profile contains active intelligence goals with detail text
- **THEN** the system MUST create news queries using the goal detail as keyword phrases
- **AND** MUST set the `derivedFrom` field to "intelligence-goal" with the goal category and detail as profile reference

#### Scenario: Queries from industry topics

- **WHEN** a user profile contains industry topics
- **THEN** the system MUST create news queries using topic keywords combined with NEAR operators for specificity
- **AND** MUST set the `derivedFrom` field to "industry" with the topic as profile reference

#### Scenario: Geographic filtering

- **WHEN** a user profile contains geographic relevance entries
- **THEN** the system MUST apply GDELT sourcecountry filters to restrict results to relevant geographies
- **AND** MUST apply geographic filters across all queries for that user

#### Scenario: Query deduplication

- **WHEN** generating news queries across multiple users
- **THEN** the system MUST deduplicate queries using content hash comparison
- **AND** MUST maintain a single query record shared across users with the same query intent
- **AND** MUST track all users associated with each query for provenance tagging

#### Scenario: Query refresh on profile update

- **WHEN** a user profile is updated (impress list, peers, intelligence goals, topics, or geographic relevance changes)
- **THEN** the system MUST regenerate the user's derived news queries
- **AND** MUST deactivate queries that no longer match any profile element
- **AND** MUST NOT delete deactivated queries to preserve historical poll state

### Requirement: GDELT DOC API Polling

The system MUST poll the GDELT DOC 2.0 API on a daily schedule for each active query.

#### Scenario: Daily article fetch

- **WHEN** a news query's poll interval has elapsed
- **THEN** the system MUST query the GDELT DOC 2.0 API with the query keywords and a 24-hour lookback window using the TIMESPAN parameter
- **AND** MUST fetch the top N articles (configurable, default 25) sorted by relevance

#### Scenario: Article normalization

- **WHEN** articles are returned from the GDELT DOC API
- **THEN** the system MUST normalize each article into a signal with: title, content (article summary), source URL, publication date, and layer "news"
- **AND** MUST store GDELT-specific metadata in the signal's metadata field: source domain, source country, article language, and GDELT document identifier

#### Scenario: Tone metadata extraction

- **WHEN** an article is returned with GDELT tone data
- **THEN** the system MUST extract tone scores (positive, negative, polarity, activity, self-reference) and store them in the signal's metadata field as `tone_positive`, `tone_negative`, `tone_polarity`, `tone_activity`, `tone_self_reference`

#### Scenario: Article deduplication

- **WHEN** a GDELT article is fetched
- **THEN** the system MUST check against previously ingested signals using source URL matching and content hash comparison
- **AND** MUST NOT create duplicate signals for articles already in the signal store

#### Scenario: Provenance tagging

- **WHEN** a news signal is created from a GDELT article
- **THEN** the system MUST create provenance records linking the signal to all users whose queries matched the article
- **AND** MUST include the trigger reason (followed-org, peer-org, impress-list, intelligence-goal, industry-scan) based on the query's `derivedFrom` field

### Requirement: GKG Entity Lookup

The system MUST support supplementary entity lookups via GDELT GKG extracted tables.

#### Scenario: Organization mention lookup

- **WHEN** the system has impress list or peer org entities to track
- **THEN** the system MUST query the GDELT GKG organizations extracted table for recent mentions of those entities
- **AND** MUST create signals for mentions not already captured by DOC API queries

#### Scenario: Person mention lookup

- **WHEN** the system has impress list contacts to track
- **THEN** the system MUST query the GDELT GKG persons extracted table for recent mentions of those contacts by name
- **AND** MUST create signals for mentions not already captured by DOC API queries

#### Scenario: GKG result normalization

- **WHEN** a GKG entity mention is found
- **THEN** the system MUST normalize it into a signal with the article title, extracted context, source URL, and layer "news"
- **AND** MUST tag the signal metadata with `gkg_source: true` to distinguish GKG-sourced signals from DOC API-sourced signals

### Requirement: News Poll State Tracking

The system MUST track polling state for each news query to avoid redundant API calls and support error recovery.

#### Scenario: Successful poll state update

- **WHEN** a news query poll completes successfully
- **THEN** the system MUST update the poll state with: last polled timestamp, result count, and content hash of the query
- **AND** MUST set the next poll time based on the configured poll interval

#### Scenario: Poll error tracking

- **WHEN** a news query poll fails
- **THEN** the system MUST increment the consecutive error count and record the error message
- **AND** MUST apply exponential backoff to the next poll time
- **AND** MUST NOT remove or deactivate the query on transient errors

#### Scenario: Rate limit handling

- **WHEN** the GDELT API returns a rate-limit response
- **THEN** the system MUST pause polling and retry after a configurable cooldown period (default: 60 seconds)
- **AND** MUST NOT count rate-limit responses as consecutive errors

### Requirement: News Ingestion Configuration

The system MUST support configurable parameters for the news ingestion layer.

#### Scenario: Configuration parameters

- **WHEN** the news ingestion layer is initialized
- **THEN** the system MUST read configuration for: poll interval (default: 1440 minutes / daily), max articles per query (default: 25), lookback window (default: 24 hours), rate limit cooldown (default: 60 seconds), inter-query delay (default: 2 seconds), and GKG lookup enabled flag (default: true)

#### Scenario: Per-query delay

- **WHEN** executing multiple GDELT queries in a single poll cycle
- **THEN** the system MUST wait at least the configured inter-query delay between consecutive API requests
- **AND** MUST NOT exceed a configurable maximum queries per cycle (default: 50)
