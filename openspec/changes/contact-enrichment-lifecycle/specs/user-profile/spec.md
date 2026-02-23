## ADDED Requirements

### Requirement: Enrichment Lifecycle Configuration

The user profile MUST support configuration of contact enrichment lifecycle parameters.

#### Scenario: Default re-enrichment interval

- **WHEN** a new user profile is created
- **THEN** the profile MUST include a `reEnrichmentIntervalDays` configuration with a default value of 90

#### Scenario: User updates re-enrichment interval

- **WHEN** a user changes their `reEnrichmentIntervalDays` value
- **THEN** the profile MUST store the new interval
- **AND** the next staleness check MUST use the updated interval for all contacts

#### Scenario: Re-enrichment interval minimum

- **WHEN** a user attempts to set `reEnrichmentIntervalDays` below 30
- **THEN** the system MUST reject the update
- **AND** MUST return an error indicating the minimum allowed interval is 30 days

## MODIFIED Requirements

### Requirement: Dynamic Impress List

The impress list MUST support multiple tiers and be modifiable at any time after onboarding. Each contact MUST carry structured deep-dive research data and a research status.

#### Scenario: Core contacts from onboarding

- **WHEN** a user adds people during onboarding
- **THEN** each person MUST be stored as a core impress contact with source "onboarding"
- **AND** core contacts MUST persist until explicitly removed by the user
- **AND** the system MUST trigger an asynchronous deep-dive research job for each contact

#### Scenario: User adds new impress contact post-onboarding

- **WHEN** a user provides a new LinkedIn URL to add to their impress list
- **THEN** the system MUST enrich the person's profile
- **AND** MUST add them as a core impress contact with source "user-added"
- **AND** MUST trigger an asynchronous deep-dive research job for the contact
- **AND** MUST return the contact immediately with `researchStatus: "pending"`

#### Scenario: User removes an impress contact

- **WHEN** a user removes a person from their impress list
- **THEN** the person MUST be marked as inactive
- **AND** MUST no longer influence briefing relevance
- **AND** the removal MUST be recorded in context history

#### Scenario: Temporary contacts from calendar

- **WHEN** a calendar meeting has enriched attendees
- **THEN** those attendees MUST be treated as temporary impress contacts for the period surrounding the meeting
- **AND** temporary contacts MUST influence briefing relevance only within their active window

#### Scenario: Temporary contacts expire

- **WHEN** a meeting has passed
- **THEN** the associated temporary impress contacts MUST expire and stop influencing briefing relevance
- **AND** the system MUST NOT delete them — they remain available for promotion

#### Scenario: Promoting temporary to core

- **WHEN** a meeting with a temporary impress contact concludes
- **THEN** the system MUST prompt the user: "Want to add [name] to your impress list permanently?"
- **AND** if the user accepts, the contact MUST be promoted to core with source "promoted-from-calendar"
- **AND** the system MUST trigger a full deep-dive research job (Perplexity + Tavily) for the promoted contact if they only had a light deep dive

#### Scenario: Unified impress list for briefing engine

- **WHEN** the briefing engine requests the impress list
- **THEN** it MUST receive all active core contacts AND all currently-active temporary contacts
- **AND** MUST distinguish between core and temporary so the engine can weight them appropriately
- **AND** MUST include deep-dive data for contacts where research is complete

#### Scenario: Impress contact data model

- **WHEN** an impress contact record is stored or returned
- **THEN** it MUST include a `researchStatus` field (one of: `"none"`, `"pending"`, `"completed"`, `"failed"`)
- **AND** MUST include a nullable `deepDiveData` field containing structured research output when available
- **AND** MUST include a `lastEnrichedAt` timestamp indicating when the contact was last enriched (null if never enriched)
- **AND** MUST include an `enrichmentVersion` integer indicating how many times the contact has been enriched (0 if never)
- **AND** MUST include an `enrichmentDepth` field (one of: `"full"`, `"light"`, `"none"`) indicating whether the contact received a full deep dive, a Perplexity-only light deep dive, or no deep dive
