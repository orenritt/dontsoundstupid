## Purpose

Channel reply processing enables users to interact with their daily briefing by replying directly on the delivery channel — email, Slack, SMS, or WhatsApp. It receives inbound messages, classifies user intent via LLM, resolves which briefing item the user is referring to, and routes the interaction to the appropriate handler (deep-dive, tuning, etc.), delivering responses back on the same channel.

## Requirements

### Requirement: Inbound Message Routing

The system MUST receive and normalize inbound replies from all supported delivery channels.

#### Scenario: Email reply received

- **WHEN** a user replies to a briefing email
- **THEN** the system MUST receive the reply via inbound email webhook (SendGrid Inbound Parse or Postmark)
- **AND** MUST extract the reply body, stripping quoted original message content and email signatures
- **AND** MUST identify the user by matching the sender address against stored user profiles

#### Scenario: Slack reply received

- **WHEN** a user sends a message in the Slack DM thread where the briefing was delivered
- **THEN** the system MUST receive the message via Slack Events API
- **AND** MUST identify the user by mapping the Slack user ID to their user profile (established during OAuth)

#### Scenario: SMS reply received

- **WHEN** a user sends an SMS reply to the number that delivered their briefing
- **THEN** the system MUST receive the message via Twilio SMS webhook
- **AND** MUST identify the user by matching the sender phone number against stored user profiles

#### Scenario: WhatsApp reply received

- **WHEN** a user replies to a briefing on WhatsApp
- **THEN** the system MUST receive the message via Twilio WhatsApp webhook
- **AND** MUST identify the user by matching the sender WhatsApp number against stored user profiles

#### Scenario: Unknown sender

- **WHEN** an inbound message is received from a sender that cannot be matched to any user profile
- **THEN** the system MUST discard the message silently
- **AND** MUST NOT respond to the unknown sender
- **AND** MUST log the event for monitoring

#### Scenario: Webhook security

- **WHEN** an inbound webhook request is received
- **THEN** the system MUST verify the webhook signature using the provider's verification mechanism (SendGrid, Twilio, or Slack signing secret)
- **AND** MUST reject requests with invalid or missing signatures

### Requirement: Inbound Message Normalization

The system MUST normalize inbound messages from all channels into a common format for processing.

#### Scenario: Message normalized to common shape

- **WHEN** a channel adapter receives a valid inbound message from an identified user
- **THEN** the system MUST produce an InboundReply containing: user ID, raw message text, channel type, conversation thread reference (for multi-turn), and received timestamp
- **AND** MUST pass the normalized reply to the intent classifier

### Requirement: Intent Classification

The system MUST classify user replies into interaction intents using LLM-powered parsing.

#### Scenario: Intent classified from free-text reply

- **WHEN** an InboundReply is received
- **THEN** the system MUST send the message text along with the user's most recent briefing items to an LLM
- **AND** the LLM MUST return a structured classification containing: intent type, resolved item number (1-5 or null), confidence score (0-1), and the original message text

#### Scenario: Supported intent types

- **WHEN** the LLM classifies a reply
- **THEN** the intent MUST be one of: `deep-dive`, `tune-more`, `tune-less`, `already-knew`, `follow-up`, `unrecognized`

#### Scenario: Low-confidence classification

- **WHEN** the LLM's confidence score is below 0.6
- **THEN** the system MUST NOT act on the classified intent
- **AND** MUST respond with a clarification question asking the user to be more specific

#### Scenario: Unrecognized intent

- **WHEN** the LLM classifies a reply as `unrecognized`
- **THEN** the system MUST respond with a short help message listing what the user can do (e.g., "You can reply with a number to learn more, say 'more like this' or 'less of this' to tune your briefings")

### Requirement: Briefing Item Resolution

The system MUST resolve which briefing item a user's reply refers to.

#### Scenario: User references item by number

- **WHEN** a user's reply contains an explicit item number (e.g., "tell me more about #3", "3", "number 3")
- **THEN** the system MUST resolve to that numbered item from the user's most recent briefing

#### Scenario: User references item by content

- **WHEN** a user's reply describes an item by content without a number (e.g., "what's the deal with that fundraise?")
- **THEN** the LLM MUST use semantic matching against the briefing items to resolve the most likely item
- **AND** MUST include the resolved item number and confidence in the classification output

#### Scenario: Ambiguous item reference

- **WHEN** the LLM cannot confidently resolve a reply to a single briefing item (e.g., two items could match)
- **THEN** the system MUST respond with a disambiguation question listing the candidate items by number (e.g., "Did you mean #2 (the fundraise) or #4 (the new hire)?")

#### Scenario: No item reference needed

- **WHEN** a user's reply is a general statement not tied to a specific item (e.g., "thanks", or a follow-up to an ongoing thread)
- **THEN** the system MUST handle it without requiring item resolution

### Requirement: Reply Session Management

The system MUST maintain per-user reply sessions to support multi-turn interactions.

#### Scenario: Session created on briefing delivery

- **WHEN** a briefing is delivered to a user
- **THEN** the system MUST create a reply session linking the user ID, briefing ID, the 5 briefing items, and the delivery channel
- **AND** the session MUST store conversation history for multi-turn context

#### Scenario: Follow-up uses session context

- **WHEN** a user sends a follow-up message after a deep-dive response (e.g., deep-dive on #2, then "who's funding them?")
- **THEN** the system MUST include the prior deep-dive response in the LLM context for intent classification
- **AND** MUST classify as `follow-up` intent tied to the same briefing item

#### Scenario: Session expiration

- **WHEN** a reply session is older than 24 hours or a new briefing is delivered to the user
- **THEN** the system MUST expire the old session
- **AND** subsequent replies MUST be matched against the new briefing's session

#### Scenario: Reply to expired session

- **WHEN** a user replies to a briefing whose session has expired
- **THEN** the system MUST respond with a message indicating the briefing is no longer active (e.g., "That briefing has expired. Check your latest briefing for what's new.")

### Requirement: Response Delivery

The system MUST deliver interaction responses back on the same channel the user replied from.

#### Scenario: Deep-dive response delivered

- **WHEN** a deep-dive intent is classified and the item is resolved
- **THEN** the system MUST send an immediate acknowledgment on the channel (e.g., "Looking into that...")
- **AND** MUST generate the deep-dive content via LLM
- **AND** MUST deliver the full deep-dive response on the same channel, formatted appropriately for that channel

#### Scenario: Feedback acknowledgment delivered

- **WHEN** a tune-more, tune-less, or already-knew intent is classified
- **THEN** the system MUST deliver a brief acknowledgment on the same channel (e.g., "Got it, more of this" or "Noted, dialing this back")
- **AND** MUST NOT require a follow-up action from the user

#### Scenario: Response formatting matches channel

- **WHEN** a response is delivered on a channel
- **THEN** the response MUST use the same formatting conventions as the original briefing delivery for that channel (HTML for email, Block Kit for Slack, plain text for SMS, WhatsApp markdown for WhatsApp)

### Requirement: Rate Limiting and Abuse Prevention

The system MUST protect against excessive or abusive inbound messages.

#### Scenario: Per-user rate limiting

- **WHEN** a user sends more than 20 replies within a 1-hour window
- **THEN** the system MUST stop processing additional replies from that user
- **AND** MUST respond with a message indicating they've reached the limit

#### Scenario: Inbound rate limiting per endpoint

- **WHEN** an inbound webhook endpoint receives more than the configured requests-per-second threshold
- **THEN** the system MUST respond with HTTP 429 and process requests from the backlog as capacity allows
