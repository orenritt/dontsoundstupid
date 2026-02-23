## ADDED Requirements

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
