## MODIFIED Requirements

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
