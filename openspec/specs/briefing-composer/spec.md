## Purpose

The Briefing Composer is the LLM-powered component that takes scored signals from the relevance engine and composes personalized daily briefings for each user. It produces exactly 5 bullet points, each 1-2 sentences, each with a reason pre-title explaining why it's being served and a link to the most pertinent source. The tone is dry, all-business, no personality — a sharp "don't fuck up" reality check. Scoring, urgency, and priority are entirely behind the scenes; the user never sees numeric scores or priority labels.

## Requirements

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
- **AND** MUST NOT send an empty briefing — better to say nothing than to waste their time

#### Scenario: Cadence

- **WHEN** configuring briefing frequency
- **THEN** the system MUST deliver exactly once per day at the user's preferred time
- **AND** MUST NOT send alerts, push notifications, or off-schedule messages

### Requirement: Briefing Format

The system MUST produce a fixed-format briefing: 5 bullet points, each 1-2 sentences, each with a reason and a source link.

#### Scenario: Briefing structure

- **WHEN** the composer generates a briefing
- **THEN** the briefing MUST contain exactly 5 items (fewer only if fewer than 5 signals pass scoring + novelty)
- **AND** each item MUST consist of:
  1. A **reason pre-title** — a short phrase explaining why this item is being served (e.g., "People are talking", "Because you're meeting Sarah Chen", "A big fundraise", "New term in your space", "Competitive move")
  2. A **1-2 sentence body** — the actual intelligence, written in dry, factual, all-business prose. No editorializing, no "you should care because," no action items, no exclamation marks
  3. A **source link** — a URL to the single most pertinent source for the item, with a short label (e.g., "TechCrunch", "arXiv", "SEC filing")

#### Scenario: Reason pre-titles

- **WHEN** the composer assigns a reason to each item
- **THEN** the reason MUST be derived from the signal's provenance and scoring context
- **AND** MUST use one of the defined reason types: people-are-talking, meeting-prep, new-entrant, fundraise-or-deal, regulatory-or-policy, term-emerging, network-activity, your-space, competitive-move, event-upcoming, other
- **AND** the reason label MUST be human-readable and specific (e.g., "Because you're meeting David Park tomorrow" not just "Meeting prep")

#### Scenario: Tone and voice

- **WHEN** the LLM composes briefing text
- **THEN** the output MUST be dry, concise, and factual
- **AND** MUST NOT include personality, humor, encouragement, or editorial commentary
- **AND** MUST NOT include action items, "so what" framing, or implications
- **AND** MUST NOT expose scoring, urgency, or priority information — all ranking is black-box
- **AND** the overall feel MUST be: "here's what you need to know so you don't look uninformed"

### Requirement: LLM-Powered Composition

The system MUST use an LLM to synthesize top-scored signals into briefing items.

#### Scenario: Signal synthesis

- **WHEN** the composer receives scored signals for a user
- **THEN** the system MUST send the top signals along with user context to the configured LLM
- **AND** MUST produce 5 briefing items that distill the most important signals
- **AND** each item MUST be a tight synthesis, not a verbatim copy of the signal summary

#### Scenario: LLM provider configuration

- **WHEN** the system composes a briefing
- **THEN** the system MUST use the configured LLM provider (openai or anthropic), model, max tokens, and temperature
- **AND** MUST record which model was used in the composed briefing metadata

### Requirement: Channel-Specific Formatting

The system MUST format the composed briefing for the user's delivery channel while preserving the 5-bullet structure. Each item MUST include a visible item number (1-5) to enable reply-by-number interaction on all channels.

#### Scenario: Email delivery

- **WHEN** the delivery channel is email
- **THEN** the system MUST render the briefing as HTML with each item as a styled block: a bold item number prefix (e.g., "**1.**"), reason label in small muted text, body text, source link below
- **AND** MUST use responsive layout for mobile email clients
- **AND** MUST set a reply-to address that routes to the inbound email processing endpoint

#### Scenario: Slack delivery

- **WHEN** the delivery channel is Slack
- **THEN** the system MUST render using Slack Block Kit: each item as a numbered section (e.g., "*1.* PEOPLE ARE TALKING") with the reason as a muted context block, body as mrkdwn text, and source as a link button

#### Scenario: SMS delivery

- **WHEN** the delivery channel is SMS
- **THEN** the system MUST render as plain text with numbered items and reason labels as bracketed prefixes (e.g., "1. [People are talking] ...")
- **AND** MUST truncate gracefully with a link to the full briefing if content exceeds limits

#### Scenario: WhatsApp delivery

- **WHEN** the delivery channel is WhatsApp
- **THEN** the system MUST render using WhatsApp-compatible markdown with numbered items, bold reason labels, and inline source links (e.g., "*1. People are talking* ...")

### Requirement: Context Injection

The system MUST inject user context into the LLM prompt to frame the briefing for the user's role and priorities.

#### Scenario: User context provided to LLM

- **WHEN** the composer builds the LLM prompt
- **THEN** the system MUST include the user's current role, company, conversation-derived context (initiatives, concerns, topics, expertise areas), and rapid-fire classifications
- **AND** the LLM MUST use this context to select and frame signals from the user's perspective
- **AND** the context MUST NOT leak into the briefing text — it informs selection, not narration

#### Scenario: Context freshness

- **WHEN** the composer builds the prompt
- **THEN** the system MUST use the latest context snapshot, not stale cached data

### Requirement: Signal Attribution

The system MUST link each briefing item back to its source signals for drill-down.

#### Scenario: Source signal linking

- **WHEN** a composed briefing item references one or more signals
- **THEN** the system MUST include the source signal IDs in the item metadata
- **AND** MUST support a "tell me more" interaction that retrieves the full signal details

#### Scenario: Source URL selection

- **WHEN** the composer selects a source URL for each item
- **THEN** the system MUST pick the single most authoritative/relevant source URL from the underlying signals
- **AND** MUST include a short label identifying the source (publication name, not the full URL)

### Requirement: Meeting-Aware Briefing

The system MUST prioritize meeting-relevant intelligence when the user has calendar sync active.

#### Scenario: Upcoming meetings detected

- **WHEN** the user has calendar sync active and meetings scheduled for today
- **THEN** meeting-relevant signals MUST be scored higher so they naturally appear among the 5 items
- **AND** those items MUST use the "meeting-prep" reason with the specific meeting/attendee context in the reason label
- **AND** meeting prep MUST NOT be a separate section — it's woven into the 5 bullets like everything else

#### Scenario: No upcoming meetings

- **WHEN** the user has no meetings scheduled for the briefing day
- **THEN** the system MUST compose the briefing normally without meeting-related reason labels

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
