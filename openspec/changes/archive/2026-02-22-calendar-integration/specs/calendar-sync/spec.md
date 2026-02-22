## ADDED Requirements

### Requirement: Calendar Connection

The system MUST support optional calendar integration with Google Calendar and Microsoft Outlook.

#### Scenario: User connects Google Calendar

- **WHEN** a user authorizes Google Calendar access via OAuth
- **THEN** the system MUST store the OAuth credentials securely
- **AND** MUST begin syncing upcoming meetings (next 7 days, rolling)

#### Scenario: User connects Outlook Calendar

- **WHEN** a user authorizes Outlook access via Microsoft Graph API OAuth
- **THEN** the system MUST store the OAuth credentials securely
- **AND** MUST begin syncing upcoming meetings (next 7 days, rolling)

#### Scenario: User skips calendar connection

- **WHEN** a user declines to connect a calendar
- **THEN** the system MUST proceed without calendar data
- **AND** the daily briefing MUST still function using profile data alone

### Requirement: Meeting Sync

The system MUST sync upcoming meetings and extract attendee information.

#### Scenario: Upcoming meetings are synced

- **WHEN** a calendar is connected
- **THEN** the system MUST fetch meetings for the next 7 days on a rolling basis
- **AND** MUST extract for each meeting: title, start time, end time, attendees (name, email), and description if available

#### Scenario: Attendee enrichment

- **WHEN** meeting attendees are extracted
- **THEN** the system MUST attempt to identify each attendee via email-to-LinkedIn lookup or enrichment API
- **AND** MUST store enriched attendee profiles (name, role, company, recent activity) linked to the meeting

#### Scenario: Meeting data refreshes automatically

- **WHEN** a calendar is connected
- **THEN** the system MUST re-sync meetings at least once every 6 hours
- **AND** MUST detect new, changed, or cancelled meetings

### Requirement: Meeting-Specific Intelligence

The system MUST generate meeting-specific briefing content based on attendee and meeting context.

#### Scenario: Pre-meeting briefing

- **WHEN** a user has an upcoming meeting within the next 24 hours
- **THEN** the system MUST generate meeting-specific intelligence including: who the attendees are, what they care about, relevant recent news about their companies or domains, and suggested talking points

#### Scenario: Meeting intelligence included in daily briefing

- **WHEN** the daily briefing is generated for a user with calendar connected
- **THEN** the briefing MUST include a "meetings today" section with per-meeting intelligence
- **AND** meetings MUST be ordered chronologically
