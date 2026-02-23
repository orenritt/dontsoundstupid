## ADDED Requirements

### Requirement: Pre-Event Enrichment

The calendar sync MUST trigger enrichment for meeting attendees ahead of events so the knowledge graph has current data for pre-meeting briefings.

#### Scenario: New external attendee gets light deep dive

- **WHEN** calendar sync extracts an external attendee who does not match any existing contact (core or temporary)
- **THEN** the system MUST create a temporary impress contact for that attendee
- **AND** MUST queue a light deep dive (Perplexity-only) for the contact with priority based on meeting proximity

#### Scenario: Stale core contact re-enriched before meeting

- **WHEN** calendar sync extracts an attendee who matches an existing core impress contact
- **AND** the contact's `lastEnrichedAt` is older than 50% of the user's `reEnrichmentIntervalDays`
- **THEN** the system MUST queue a re-enrichment job for that contact with elevated priority
- **AND** MUST NOT create a duplicate temporary contact

#### Scenario: Fresh core contact skips enrichment

- **WHEN** calendar sync extracts an attendee who matches an existing core impress contact
- **AND** the contact's `lastEnrichedAt` is within 50% of the user's `reEnrichmentIntervalDays`
- **THEN** the system MUST NOT queue any enrichment job
- **AND** MUST NOT create a duplicate temporary contact

#### Scenario: Enrichment priority by meeting proximity

- **WHEN** multiple attendees across multiple meetings need enrichment
- **THEN** the system MUST prioritize enrichment for meetings within 24 hours over meetings further out
- **AND** within the same time window, MUST prioritize core contacts over temporary contacts

### Requirement: Calendar Contact Deduplication

The calendar sync MUST deduplicate attendees against existing contacts before creating temporary impress contacts.

#### Scenario: Attendee matches existing contact by email

- **WHEN** a calendar attendee's email matches an existing core or temporary impress contact's email
- **THEN** the system MUST NOT create a new temporary contact
- **AND** MUST link the meeting to the existing contact record

#### Scenario: Attendee matches existing contact by name and company

- **WHEN** a calendar attendee's name and company fuzzy-match an existing core or temporary impress contact
- **AND** no email match was found
- **THEN** the system MUST NOT create a new temporary contact
- **AND** MUST link the meeting to the existing contact record

#### Scenario: No match found creates new temporary contact

- **WHEN** a calendar attendee does not match any existing contact by email or name+company
- **THEN** the system MUST create a new temporary impress contact as currently specified

## MODIFIED Requirements

### Requirement: Calendar-Derived Impress Contacts

The calendar sync MUST automatically surface meeting attendees as temporary impress contacts.

#### Scenario: Meeting attendees become temporary contacts

- **WHEN** a meeting is synced and attendees are enriched
- **THEN** external attendees (not from the user's own company) who do not match existing contacts MUST be added as temporary impress contacts
- **AND** the temporary contact MUST be linked to the meeting that triggered it
- **AND** the system MUST queue a light deep dive (Perplexity-only) for each new temporary contact

#### Scenario: Post-meeting promotion prompt

- **WHEN** a meeting with temporary impress contacts has concluded
- **THEN** the system MUST prompt the user to optionally promote any temporary contact to their permanent core impress list
