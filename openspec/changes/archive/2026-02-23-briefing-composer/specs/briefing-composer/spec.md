## ADDED Requirements

### Requirement: Daily Briefing Generation

The system MUST generate personalized daily briefings triggered by each user's preferred delivery time.

#### Scenario: Scheduled briefing trigger

- **WHEN** a user's configured delivery time arrives (in their timezone)
- **THEN** the system MUST gather the user's top-scored signals since the last briefing
- **AND** MUST compose a personalized briefing using an LLM
- **AND** MUST deliver it via the user's preferred channel

#### Scenario: No new signals

- **WHEN** the delivery time arrives but no new scored signals exist for the user
- **THEN** the system MUST skip generation and record that no briefing was needed
- **AND** MUST NOT send an empty briefing

### Requirement: LLM-Powered Composition

The system MUST use an LLM to synthesize top-scored signals into a coherent narrative briefing.

#### Scenario: Signal synthesis

- **WHEN** the composer receives scored signals for a user
- **THEN** the system MUST send the signals along with user context to the configured LLM
- **AND** MUST produce a briefing with titled sections, each synthesizing related signals into a coherent narrative
- **AND** MUST NOT simply list signal summaries verbatim — the LLM MUST add connective context and relevance framing

#### Scenario: LLM provider configuration

- **WHEN** the system composes a briefing
- **THEN** the system MUST use the configured LLM provider (openai or anthropic), model, max tokens, and temperature
- **AND** MUST record which model was used in the composed briefing metadata

### Requirement: Format Adaptation

The system MUST adapt briefing output to the user's format preference.

#### Scenario: Concise format

- **WHEN** the user's format preference is "concise"
- **THEN** the system MUST produce 3–5 bullet points covering the highest-priority signals
- **AND** each bullet MUST be a single sentence with signal attribution

#### Scenario: Standard format

- **WHEN** the user's format preference is "standard"
- **THEN** the system MUST produce structured sections with titles, 2–3 sentence summaries, and grouped related signals

#### Scenario: Detailed format

- **WHEN** the user's format preference is "detailed"
- **THEN** the system MUST produce a full analysis with context, implications, and recommended actions per signal group

### Requirement: Channel-Specific Formatting

The system MUST format the composed briefing for the user's delivery channel.

#### Scenario: Email delivery

- **WHEN** the delivery channel is email
- **THEN** the system MUST render the briefing as HTML with proper heading hierarchy, inline styles, and responsive layout

#### Scenario: Slack delivery

- **WHEN** the delivery channel is Slack
- **THEN** the system MUST render the briefing using Slack Block Kit format with sections, dividers, and mrkdwn text

#### Scenario: SMS delivery

- **WHEN** the delivery channel is SMS
- **THEN** the system MUST render the briefing as plain text within SMS character limits
- **AND** MUST truncate gracefully with a link to the full briefing if content exceeds limits

#### Scenario: WhatsApp delivery

- **WHEN** the delivery channel is WhatsApp
- **THEN** the system MUST render the briefing using WhatsApp-compatible markdown (bold, italic, lists)

### Requirement: Context Injection

The system MUST inject user context into the LLM prompt to frame the briefing for the user's role and priorities.

#### Scenario: User context provided to LLM

- **WHEN** the composer builds the LLM prompt
- **THEN** the system MUST include the user's current role, company, active initiatives, active concerns, and intelligence goals
- **AND** the LLM MUST use this context to frame signal relevance from the user's perspective

#### Scenario: Context freshness

- **WHEN** the composer builds the prompt
- **THEN** the system MUST use the latest context snapshot, not stale cached data

### Requirement: Signal Attribution

The system MUST link each briefing item back to its source signals for drill-down.

#### Scenario: Source signal linking

- **WHEN** a composed briefing section references one or more signals
- **THEN** the system MUST include the source signal IDs in the section metadata
- **AND** MUST support a "tell me more" interaction that retrieves the full signal details

#### Scenario: Attribution accuracy

- **WHEN** the LLM synthesizes multiple signals into a section
- **THEN** every signal used MUST be listed in that section's source signal IDs
- **AND** the system MUST NOT attribute signals that were not included in the prompt

### Requirement: Meeting-Aware Briefing

The system MUST prepend meeting-relevant intelligence when the user has calendar sync active.

#### Scenario: Upcoming meetings detected

- **WHEN** the user has calendar sync active and meetings scheduled for today
- **THEN** the system MUST prepend a "Meeting Prep" section with intelligence relevant to each meeting's attendees, companies, and topics
- **AND** MUST include this context in the LLM prompt for integrated composition

#### Scenario: No upcoming meetings

- **WHEN** the user has no meetings scheduled for the briefing day
- **THEN** the system MUST omit the meeting prep section

### Requirement: Delivery Scheduling and Retry

The system MUST schedule briefing deliveries per user timezone and retry on failure.

#### Scenario: Timezone-aware scheduling

- **WHEN** a user configures a preferred delivery time and timezone
- **THEN** the system MUST calculate the next delivery timestamp in UTC based on the user's local time
- **AND** MUST update the schedule after each delivery

#### Scenario: Delivery retry on failure

- **WHEN** a delivery attempt fails (network error, channel unavailable)
- **THEN** the system MUST retry up to 3 times with exponential backoff
- **AND** MUST record each attempt with status (pending/sent/failed/bounced) and error message

#### Scenario: Delivery tracking

- **WHEN** a briefing is delivered or delivery fails
- **THEN** the system MUST record a DeliveryAttempt with the briefing ID, channel used, status, timestamp, and any error details
