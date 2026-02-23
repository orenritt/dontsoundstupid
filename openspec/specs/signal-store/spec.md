# signal-store Specification

## Purpose
TBD - created by archiving change signal-store. Update Purpose after archive.
## Requirements
### Requirement: Universal Signal Model

The system MUST store all ingested signals in a universal format regardless of source layer.

#### Scenario: Signal created from any ingestion layer

- **WHEN** any ingestion layer produces a signal
- **THEN** the system MUST store it with: unique ID, source layer (syndication, research, narrative, events, personal-graph, ai-research), source URL, title, content, summary, structured metadata (key-value), timestamp of original publication, timestamp of ingestion
- **AND** MUST generate and store a vector embedding of the signal content for semantic search

#### Scenario: Signal metadata varies by layer

- **WHEN** a signal is ingested from a specific layer
- **THEN** the structured metadata MUST capture layer-specific fields (e.g., author for research, event name for events, feed URL for syndication, citations for ai-research, research provider for ai-research)
- **AND** the universal fields MUST remain consistent across all layers

### Requirement: Vector Embeddings

The system MUST generate vector embeddings for every signal to support semantic search and LLM-friendly retrieval.

#### Scenario: Embedding generated on ingestion

- **WHEN** a new signal is stored
- **THEN** the system MUST generate a vector embedding from the signal's title + content using a configured embedding model
- **AND** MUST store the embedding alongside the signal for vector similarity queries

#### Scenario: Semantic search against embeddings

- **WHEN** the relevance scoring engine or briefing composer queries the signal store
- **THEN** the system MUST support vector similarity search (cosine distance) against stored embeddings
- **AND** MUST support combining vector similarity with structured metadata filters (layer, date range, source)

### Requirement: Deduplication

The system MUST prevent the same real-world event or announcement from appearing as multiple signals.

#### Scenario: Cross-layer deduplication

- **WHEN** a new signal is ingested
- **THEN** the system MUST check for existing signals with high semantic similarity (above a configurable threshold)
- **AND** if a near-duplicate is found, MUST link the new signal to the existing one rather than creating a separate entry
- **AND** MUST record which layers contributed to the deduplicated signal

#### Scenario: Same-source deduplication

- **WHEN** a signal is ingested from a source URL that already exists in the store
- **THEN** the system MUST update the existing signal rather than creating a duplicate

### Requirement: Signal Querying

The system MUST support efficient querying of signals for briefing generation.

#### Scenario: Query by date range and layer

- **WHEN** the briefing engine requests signals
- **THEN** the system MUST support filtering by date range, source layer, and metadata fields

#### Scenario: Query by semantic relevance

- **WHEN** the briefing engine provides a set of relevance keywords or an embedding vector
- **THEN** the system MUST return signals ranked by vector similarity
- **AND** MUST support combining semantic ranking with metadata filters

#### Scenario: Shared pool across users

- **WHEN** multiple users exist in the system
- **THEN** all signals MUST be stored in a single shared pool
- **AND** per-user relevance scoring MUST happen at query time, not at ingestion time

### Requirement: Signal Provenance

The system MUST track why each signal was collected and which users triggered its ingestion.

#### Scenario: Provenance recorded on ingestion

- **WHEN** a signal is ingested
- **THEN** the system MUST create a provenance record linking the signal to: the triggering user ID, the trigger reason (e.g., followed-org, peer-org, impress-list, intelligence-goal, industry-scan, personal-graph), and the specific profile element that caused the ingestion (e.g., org name, person name, keyword)

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

