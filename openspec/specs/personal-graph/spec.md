# personal-graph Specification

## Purpose

Layer 5 of the signal generation pipeline. Models the user's professional network as a graph of people and organizations, tracks watched nodes for activity (announcements, fundraising, hiring, new terminology, topic velocity), and emits personal-graph signals into the shared signal store.

## Requirements

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

#### Scenario: Contact change detected

- **WHEN** re-enrichment of a watched person node detects a material change (company, role, or focus area shift)
- **THEN** the system MUST emit a signal with activity type `contact-change`
- **AND** the signal details MUST include the change subtype, the person, and the specific before/after values

### Requirement: Re-Enrichment Change Signals

The personal graph MUST emit signals when re-enrichment of a watched person detects material changes.

#### Scenario: Company change signal emitted

- **WHEN** re-enrichment of a person node detects a company change
- **THEN** the system MUST emit a signal with activity type `contact-change` and change subtype `company-change`
- **AND** the signal details MUST include the person's name, previous company, new company, and previous/new role
- **AND** the signal MUST have layer `personal-graph` and source `re-enrichment`

#### Scenario: Role change signal emitted

- **WHEN** re-enrichment of a person node detects a material role change (seniority or function shift at same company)
- **THEN** the system MUST emit a signal with activity type `contact-change` and change subtype `role-change`
- **AND** the signal details MUST include the person's name, company, previous role, and new role

#### Scenario: Focus area shift signal emitted

- **WHEN** re-enrichment of a person node detects a material focus area shift (more than one area added or removed)
- **THEN** the system MUST emit a signal with activity type `contact-change` and change subtype `focus-shift`
- **AND** the signal details MUST include the person's name, added focus areas, and removed focus areas

#### Scenario: Knowledge graph updated on re-enrichment

- **WHEN** a re-enrichment completes for a watched person node
- **THEN** the system MUST update the person entity's description with the new deep-dive summary
- **AND** MUST create new `cares-about` edges for newly discovered focus areas and interests
- **AND** MUST reduce confidence to 0.3 on `cares-about` edges for focus areas no longer present in the new enrichment
- **AND** MUST NOT delete any existing edges

#### Scenario: Company graph edge updated on company change

- **WHEN** re-enrichment detects a company change for a person node
- **THEN** the system MUST create a new `works-at` edge to the new company's organization node
- **AND** MUST mark the previous `works-at` edge as historical with an end timestamp
- **AND** MUST create the new organization node if it does not already exist

### Requirement: Personal Graph Configuration

The system MUST support configuration of graph processing parameters.

#### Scenario: Configuration applied to graph processing

- **WHEN** the personal graph layer processes watched nodes
- **THEN** the system MUST respect the configured enrichment refresh interval for re-enriching node data
- **AND** MUST NOT exceed the configured max watch nodes limit
- **AND** MUST use the configured activity detection threshold for topic velocity calculations
