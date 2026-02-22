## ADDED Requirements

### Requirement: Calendar Connection Status

The user profile MUST track whether a calendar is connected and its sync state.

#### Scenario: Profile includes calendar status

- **WHEN** a user connects a calendar
- **THEN** the profile MUST store: calendar provider (Google or Outlook), connection status (connected/disconnected), last sync timestamp

#### Scenario: Profile without calendar

- **WHEN** a user has not connected a calendar
- **THEN** the profile MUST indicate calendar is not connected
- **AND** all other profile features MUST function normally

## MODIFIED Requirements

### Requirement: Unified Profile

The system MUST provide a unified profile that combines all layers for the briefing engine.

#### Scenario: Profile serves the briefing engine

- **WHEN** the briefing engine requests a user profile
- **THEN** it MUST receive a unified object combining identity and context layers
- **AND** the profile MUST include: the user's identity, their impress list, confirmed peer organizations (with comments), derived relevance keywords for signal matching, and calendar connection status with upcoming meeting data when available
