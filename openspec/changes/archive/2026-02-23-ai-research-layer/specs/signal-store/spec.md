## MODIFIED Requirements

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
