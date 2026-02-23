## ADDED Requirements

### Requirement: Scheduled Re-Enrichment

The system MUST re-run the deep-dive research pipeline for core impress contacts on a configurable schedule to keep enrichment data current.

#### Scenario: Scheduled re-enrichment triggered

- **WHEN** a core impress contact's `lastEnrichedAt` timestamp is older than the user's configured `reEnrichmentIntervalDays` (default: 90)
- **THEN** the system MUST queue a full deep-dive research job (Perplexity + Tavily + LLM structuring) for that contact
- **AND** MUST set `researchStatus` to `"pending"` while the job runs

#### Scenario: Re-enrichment preserves previous data until complete

- **WHEN** a re-enrichment job is queued for a contact
- **THEN** the system MUST NOT clear existing `deepDiveData` until the new research completes successfully
- **AND** the previous data MUST remain available for briefing generation during the re-enrichment window

#### Scenario: Re-enrichment updates timestamps

- **WHEN** a re-enrichment job completes successfully
- **THEN** the system MUST update `lastEnrichedAt` to the current timestamp
- **AND** MUST increment `enrichmentVersion`
- **AND** MUST set `researchStatus` to `"completed"`

#### Scenario: Re-enrichment check runs daily

- **WHEN** the daily pipeline executes
- **THEN** the system MUST check all core impress contacts across all users for staleness
- **AND** MUST queue re-enrichment jobs for contacts exceeding their re-enrichment interval

### Requirement: Re-Enrichment Diff Detection

The system MUST compare old and new deep-dive data after re-enrichment and detect material changes.

#### Scenario: Diff computed on re-enrichment completion

- **WHEN** a re-enrichment job completes with new structured data
- **THEN** the system MUST compare the previous `deepDiveData` against the new data across all structured fields: interests, focusAreas, recentActivity, talkingPoints, companyContext, and summary

#### Scenario: Material change — company changed

- **WHEN** re-enrichment detects that the contact's company has changed
- **THEN** the system MUST classify this as a material change
- **AND** MUST include the previous and new company in the diff output

#### Scenario: Material change — role changed with function or seniority shift

- **WHEN** re-enrichment detects that the contact's role has changed at the same company
- **AND** the change represents a seniority or function shift (not just a title rewording)
- **THEN** the system MUST classify this as a material change

#### Scenario: Material change — focus areas shifted

- **WHEN** re-enrichment detects that more than one focus area has been added or removed
- **THEN** the system MUST classify this as a material change

#### Scenario: Non-material changes ignored

- **WHEN** re-enrichment detects only minor changes (wording tweaks, single interest addition, same-level title change)
- **THEN** the system MUST NOT classify this as a material change
- **AND** MUST still update the stored `deepDiveData` with the new results

### Requirement: Light Deep Dive for Temporary Contacts

The system MUST support a lighter enrichment mode using Perplexity-only (no Tavily) for calendar-derived temporary contacts.

#### Scenario: Light deep dive triggered for new temporary contact

- **WHEN** a calendar attendee is created as a temporary impress contact
- **AND** no existing deep-dive data exists for that person
- **THEN** the system MUST run a light deep dive using Perplexity only
- **AND** MUST structure the output using the same LLM structuring step as the full deep dive
- **AND** MUST store the result in `deepDiveData` with `enrichmentVersion: 1`

#### Scenario: Light deep dive produces knowledge graph entities

- **WHEN** a light deep dive completes for a temporary contact
- **THEN** the system MUST seed the knowledge graph with `concept` entities for interests and focus areas with `source: "calendar-deep-dive"` and `confidence: 0.6`
- **AND** MUST create `cares-about` edges from the person entity to each concept entity

#### Scenario: Full deep dive on promotion

- **WHEN** a temporary contact is promoted to core
- **AND** the contact was previously enriched with a light deep dive only
- **THEN** the system MUST queue a full deep dive (Perplexity + Tavily) to upgrade the enrichment data
- **AND** MUST update the knowledge graph with the richer results

## MODIFIED Requirements

### Requirement: Deep-Dive Research Trigger

The system MUST automatically run a deep-dive research job on each impress contact when they are added.

#### Scenario: Deep dive triggered on add from settings

- **WHEN** a user adds an impress contact via the settings API
- **THEN** the system MUST return the contact immediately with `researchStatus: "pending"`
- **AND** MUST trigger an asynchronous deep-dive research job for that contact
- **AND** the response MUST NOT block on research completion

#### Scenario: Deep dive triggered on add from onboarding

- **WHEN** a user adds impress contacts during onboarding
- **THEN** the system MUST trigger an asynchronous deep-dive research job for each contact
- **AND** onboarding completion MUST NOT block on research completion

#### Scenario: Deep dive triggered retroactively

- **WHEN** a user triggers a deep dive on an existing contact that has `researchStatus: "none"` or `researchStatus: "failed"`
- **THEN** the system MUST run the deep-dive research job for that contact
- **AND** MUST update the `researchStatus` to `"pending"` immediately

#### Scenario: Deep dive sets enrichment tracking fields

- **WHEN** a deep-dive research job completes successfully for any trigger type
- **THEN** the system MUST set `lastEnrichedAt` to the current timestamp
- **AND** MUST set `enrichmentVersion` to 1 for first-time enrichment or increment by 1 for re-enrichment
