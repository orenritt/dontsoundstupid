## MODIFIED Requirements

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
