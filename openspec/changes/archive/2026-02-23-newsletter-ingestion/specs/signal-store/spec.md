## MODIFIED Requirements

### Requirement: Universal Signal Model

The system MUST store all ingested signals in a universal format regardless of source layer.

#### Scenario: Signal created from any ingestion layer

- **WHEN** any ingestion layer produces a signal
- **THEN** the system MUST store it with: unique ID, source layer (syndication, research, narrative, events, personal-graph, ai-research, email-forward, news, newsletter), source URL, title, content, summary, structured metadata (key-value), timestamp of original publication, timestamp of ingestion
- **AND** MUST generate and store a vector embedding of the signal content for semantic search

#### Scenario: Signal metadata varies by layer

- **WHEN** a signal is ingested from a specific layer
- **THEN** the structured metadata MUST capture layer-specific fields (e.g., author for research, event name for events, feed URL for syndication, citations for ai-research, research provider for ai-research, newsletter registry ID and newsletter name for newsletter)
- **AND** the universal fields MUST remain consistent across all layers

### Requirement: Signal Provenance

The system MUST track why each signal was collected and which users triggered its ingestion.

#### Scenario: Provenance recorded on ingestion

- **WHEN** a signal is ingested
- **THEN** the system MUST create a provenance record linking the signal to: the triggering user ID, the trigger reason (e.g., followed-org, peer-org, impress-list, intelligence-goal, industry-scan, personal-graph, user-curated, newsletter-subscription), and the specific profile element that caused the ingestion (e.g., org name, person name, keyword, newsletter name)

#### Scenario: Multiple provenance records per signal

- **WHEN** the same signal is relevant to multiple users' ingestion criteria
- **THEN** the system MUST store a separate provenance record for each user-trigger combination
- **AND** the signal itself MUST remain a single entry in the shared pool

#### Scenario: Provenance as relevance pre-signal

- **WHEN** the relevance scoring engine scores a signal for a user
- **THEN** it MUST check whether provenance records exist for that user
- **AND** signals with direct provenance for the user MUST receive a relevance boost

#### Scenario: Provenance enables cross-user discovery

- **WHEN** the system identifies users with similar profiles
- **THEN** it MUST be able to query signals by provenance of similar users
- **AND** MUST use those signals as candidate recommendations for the target user
