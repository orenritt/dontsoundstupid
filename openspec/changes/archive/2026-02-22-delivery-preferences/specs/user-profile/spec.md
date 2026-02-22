## ADDED Requirements

### Requirement: Delivery Preferences

The system MUST store the user's preferred delivery channel, timing, and format as part of their profile.

#### Scenario: Delivery channel selection

- **WHEN** a user selects a delivery channel during onboarding
- **THEN** the profile MUST store the selected channel (email, Slack, SMS, or WhatsApp)
- **AND** MUST store any channel-specific configuration (e.g., email address, Slack workspace/channel, phone number)

#### Scenario: Delivery time selection

- **WHEN** a user specifies their preferred delivery time
- **THEN** the profile MUST store the time and timezone
- **AND** the briefing engine MUST use this to schedule delivery

#### Scenario: Format preference

- **WHEN** a user selects a briefing format
- **THEN** the profile MUST store the preference (concise: 3-5 bullets, standard: summary with context, detailed: full briefing with links and sources)

#### Scenario: Delivery preferences are updatable

- **WHEN** a user changes their delivery channel, time, or format
- **THEN** the profile MUST reflect the updated preferences without affecting other profile data

## MODIFIED Requirements

### Requirement: Unified Profile

The system MUST provide a unified profile that combines all layers for the briefing engine.

#### Scenario: Profile serves the briefing engine

- **WHEN** the briefing engine requests a user profile
- **THEN** it MUST receive a unified object combining identity and context layers
- **AND** the profile MUST include: the user's identity, their impress list, confirmed peer organizations (with comments), derived relevance keywords for signal matching, and delivery preferences (channel, time, format)
