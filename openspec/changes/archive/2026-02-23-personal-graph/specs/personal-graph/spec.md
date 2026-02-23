## ADDED Requirements

### Requirement: Graph Node Model

The system MUST represent people and organizations in the user's professional network as graph nodes with enrichment references and watch priority.

#### Scenario: Node created from impress list contact

- **WHEN** a contact exists on the user's impress list
- **THEN** the system MUST create a graph node of type `person` with added-source `impress-list`
- **AND** MUST store a reference to the enrichment data (EnrichedPerson)
- **AND** MUST assign a default watch priority of `high`

#### Scenario: Node created from LinkedIn connection

- **WHEN** a LinkedIn connection is imported
- **THEN** the system MUST create a graph node of type `person` with added-source `linkedin-connection`
- **AND** MUST store the LinkedIn URL as enrichment reference
- **AND** MUST assign a default watch priority of `medium`

#### Scenario: Node auto-derived from existing nodes

- **WHEN** the system identifies an organization associated with watched people
- **THEN** the system MUST create a graph node of type `organization` with added-source `auto-derived`
- **AND** MUST assign a default watch priority of `low`

### Requirement: Graph Edge Model

The system MUST track relationships between graph nodes using typed, directed edges.

#### Scenario: Person works at organization

- **WHEN** a person node's enrichment data indicates a current employer
- **THEN** the system MUST create a `works-at` edge from the person node to the organization node

#### Scenario: Person connected to person

- **WHEN** two person nodes are LinkedIn connections
- **THEN** the system MUST create a `connected-to` edge between the two person nodes

#### Scenario: Person mentioned by another person

- **WHEN** a watched person references another person in tracked content
- **THEN** the system MUST create a `mentioned-by` edge from the mentioned person to the mentioning person

### Requirement: Watch Tracking

The system MUST maintain a per-node watchlist specifying which activity types to monitor.

#### Scenario: Watch created for a node

- **WHEN** a graph node is created with watch priority `high` or `medium`
- **THEN** the system MUST create watch entries for all activity types: announcements, fundraising, hiring, terms, content
- **AND** MUST record the creation timestamp as last-checked

#### Scenario: Watch checked timestamp updated

- **WHEN** the system completes an activity check for a watched node
- **THEN** the system MUST update the last-checked timestamp for that watch entry

### Requirement: Activity Detection and Signal Emission

The system MUST detect specific activity types from watched nodes and emit personal-graph signals.

#### Scenario: New term usage detected

- **WHEN** a watched person begins using terminology not previously observed in their content
- **THEN** the system MUST emit a signal with activity type `new-term-usage`
- **AND** the signal details MUST include the new term, the person, and example usage

#### Scenario: Organization announcement detected

- **WHEN** a watched organization publishes an announcement (product launch, partnership, etc.)
- **THEN** the system MUST emit a signal with activity type `announcement`
- **AND** the signal details MUST include the announcement summary and source URL

#### Scenario: Fundraising activity detected

- **WHEN** a watched organization's fundraising status changes
- **THEN** the system MUST emit a signal with activity type `fundraising`
- **AND** the signal details MUST include the funding stage, amount if available, and source

#### Scenario: Hiring activity detected

- **WHEN** a watched organization posts new job listings
- **THEN** the system MUST emit a signal with activity type `hiring`
- **AND** the signal details MUST include the number of new postings and key roles

#### Scenario: Topic velocity detected

- **WHEN** a topic's mention frequency within the user's graph exceeds the configured activity detection threshold
- **THEN** the system MUST emit a signal with activity type `topic-velocity`
- **AND** the signal details MUST include the topic, velocity metric, and contributing nodes

### Requirement: Personal Graph Configuration

The system MUST support configuration of graph processing parameters.

#### Scenario: Configuration applied to graph processing

- **WHEN** the personal graph layer processes watched nodes
- **THEN** the system MUST respect the configured enrichment refresh interval for re-enriching node data
- **AND** MUST NOT exceed the configured max watch nodes limit
- **AND** MUST use the configured activity detection threshold for topic velocity calculations
