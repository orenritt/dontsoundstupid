## MODIFIED Requirements

### Requirement: Daily Briefing Generation

The system MUST generate personalized daily briefings triggered by each user's preferred delivery time.

#### Scenario: Scheduled briefing trigger

- **WHEN** a user's configured delivery time arrives (in their timezone)
- **THEN** the system MUST gather the user's top-scored signals since the last briefing
- **AND** MUST compose a personalized briefing using an LLM if one or more signals cleared the interestingness threshold
- **AND** MUST deliver it via the user's preferred channel

#### Scenario: No signals clear interestingness threshold

- **WHEN** the delivery time arrives and the scoring agent returns zero selections (no signals cleared the interestingness bar)
- **THEN** the system MUST skip briefing generation and delivery
- **AND** MUST record a pipeline status of `"skipped-nothing-interesting"` with metadata including the candidate count and scoring reasoning
- **AND** MUST NOT send any message to the user — silence is the correct response when nothing is worth their time

#### Scenario: No new signals

- **WHEN** the delivery time arrives but no new scored signals exist for the user
- **THEN** the system MUST skip generation and record that no briefing was needed
- **AND** MUST NOT send an empty briefing — better to say nothing than to waste their time

#### Scenario: Cadence

- **WHEN** configuring briefing frequency
- **THEN** the system MUST deliver exactly once per day at the user's preferred time
- **AND** MUST NOT send alerts, push notifications, or off-schedule messages

### Requirement: Briefing Format

The system MUST produce a variable-length briefing of 1 to 5 items, each 1-2 sentences, each with a reason and a source link.

#### Scenario: Briefing structure

- **WHEN** the composer generates a briefing
- **THEN** the briefing MUST contain between 1 and 5 items, matching the number of signals that cleared the interestingness threshold during scoring
- **AND** each item MUST consist of:
  1. A **reason pre-title** — a short phrase explaining why this item is being served (e.g., "People are talking", "Because you're meeting Sarah Chen", "A big fundraise", "New term in your space", "Competitive move")
  2. A **1-2 sentence body** — the actual intelligence, written in dry, factual, all-business prose. No editorializing, no "you should care because," no action items, no exclamation marks
  3. A **source link** — a URL to the single most pertinent source for the item, with a short label (e.g., "TechCrunch", "arXiv", "SEC filing")
- **AND** the system MUST NOT pad the briefing with lower-quality items to reach 5

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

- **WHEN** the composer receives 1 to 5 scored signals for a user
- **THEN** the system MUST send the signals along with user context to the configured LLM
- **AND** MUST produce one briefing item per scored signal
- **AND** each item MUST be a tight synthesis, not a verbatim copy of the signal summary

#### Scenario: LLM provider configuration

- **WHEN** the system composes a briefing
- **THEN** the system MUST use the configured LLM provider (openai or anthropic), model, max tokens, and temperature
- **AND** MUST record which model was used in the composed briefing metadata

### Requirement: Channel-Specific Formatting

The system MUST format the composed briefing for the user's delivery channel while preserving the variable-length item structure. Each item MUST include a visible item number to enable reply-by-number interaction on all channels.

#### Scenario: Email delivery

- **WHEN** the delivery channel is email
- **THEN** the system MUST render the briefing as HTML with each item as a styled block: a bold item number prefix (e.g., "**1.**"), reason label in small muted text, body text, source link below
- **AND** MUST use responsive layout for mobile email clients
- **AND** MUST set a reply-to address that routes to the inbound email processing endpoint
- **AND** item numbering MUST be sequential starting from 1 up to the actual item count

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
