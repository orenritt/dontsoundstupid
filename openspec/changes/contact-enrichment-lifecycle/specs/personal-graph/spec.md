## ADDED Requirements

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

## MODIFIED Requirements

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
