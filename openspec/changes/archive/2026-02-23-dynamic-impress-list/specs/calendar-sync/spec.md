## ADDED Requirements

### Requirement: Calendar-Derived Impress Contacts

The calendar sync MUST automatically surface meeting attendees as temporary impress contacts.

#### Scenario: Meeting attendees become temporary contacts

- **WHEN** a meeting is synced and attendees are enriched
- **THEN** external attendees (not from the user's own company) MUST be added as temporary impress contacts
- **AND** the temporary contact MUST be linked to the meeting that triggered it

#### Scenario: Post-meeting promotion prompt

- **WHEN** a meeting with temporary impress contacts has concluded
- **THEN** the system MUST prompt the user to optionally promote any temporary contact to their permanent core impress list
