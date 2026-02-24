# briefing-interaction Specification

## Purpose
TBD - created by archiving change briefing-feedback-loop. Update Purpose after archive.
## Requirements
### Requirement: Briefing Item Identity

Every briefing item MUST be individually addressable so users can interact with specific items.

#### Scenario: Each briefing item has a unique ID

- **WHEN** the system generates a daily briefing
- **THEN** each item in the briefing MUST have a unique, stable identifier
- **AND** the identifier MUST be usable to reference the item in user responses

### Requirement: Deep-Dive Interaction

The system MUST allow users to request immediate expanded information on any briefing item, using Perplexity Sonar for grounded research when available.

#### Scenario: User requests deep-dive on a briefing item

- **WHEN** a user responds to a briefing item with a deep-dive request (e.g., "tell me more", "what does that mean?", "explain this") via the briefing reader or by replying on the delivery channel
- **THEN** the system MUST identify the referenced briefing item
- **AND** if `PERPLEXITY_API_KEY` is configured, MUST generate the deep-dive response using a Perplexity Sonar query that includes the briefing item topic, original content, and user profile context (role, company, initiatives)
- **AND** if Perplexity is not configured, MUST fall back to the existing LLM-based deep-dive response
- **AND** MUST generate expanded content including: deeper context, background explanation, related developments, source links, and why it's relevant to the user's profile

#### Scenario: Deep-dive delivered on same channel

- **WHEN** a deep-dive response is generated
- **THEN** it MUST be delivered on the same channel the user responded from (web app, email, Slack, SMS, or WhatsApp)
- **AND** MUST be delivered immediately (not deferred to the next daily briefing)
- **AND** for channel replies, MUST send an immediate acknowledgment before generating the full response

#### Scenario: Deep-dive recorded as signal

- **WHEN** a user requests a deep-dive
- **THEN** the system MUST record the interaction as a positive interest signal for that topic/category
- **AND** this signal MUST inform future briefing relevance

### Requirement: Relevance Tuning Feedback

The system MUST allow users to tune future briefings by giving directional feedback on briefing items, via both the web app and direct channel replies.

#### Scenario: User requests more of a topic

- **WHEN** a user responds to a briefing item with positive tuning feedback (e.g., "more like this", "focus more on this", "this is important") via the briefing reader or by replying on the delivery channel
- **THEN** the system MUST record a positive relevance signal for the item's topic, category, and source
- **AND** future briefings MUST increase weighting for similar content

#### Scenario: User requests less of a topic

- **WHEN** a user responds to a briefing item with negative tuning feedback (e.g., "less of this", "not relevant", "don't care about this") via the briefing reader or by replying on the delivery channel
- **THEN** the system MUST record a negative relevance signal for the item's topic, category, and source
- **AND** future briefings MUST decrease weighting for similar content

#### Scenario: Tuning is gradual, not absolute

- **WHEN** a user gives negative feedback on a topic
- **THEN** the system MUST reduce but NOT completely eliminate that topic from future briefings
- **AND** a single negative signal MUST NOT permanently suppress a topic
- **AND** repeated negative signals on the same topic MUST progressively reduce its presence

#### Scenario: Tuning feedback is acknowledged

- **WHEN** a user provides tuning feedback
- **THEN** the system MUST acknowledge the feedback with a brief confirmation (e.g., "Got it, I'll show you more of this" or "Noted, I'll dial this back")
- **AND** for channel replies, the acknowledgment MUST be delivered on the same channel the user replied from

