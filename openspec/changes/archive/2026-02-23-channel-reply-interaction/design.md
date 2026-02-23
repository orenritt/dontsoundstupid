## Context

Briefings are delivered to users on 4 channels: email, Slack, SMS, and WhatsApp. The briefing-interaction spec defines deep-dive, positive tuning, negative tuning, and "already knew this" interactions — but the only concrete interaction surface today is the web app's briefing reader (buttons in the UI). The channel deliveries are effectively read-only. Users who want to interact must leave their channel and open the app.

This design covers the inbound side: receiving replies on each channel, understanding what the user wants, resolving which briefing item they're referring to, and delivering a response back on the same channel.

## Goals / Non-Goals

**Goals:**
- Accept free-text replies on all 4 delivery channels and route them to the existing interaction handlers (deep-dive, tune-more, tune-less, already-knew)
- Use LLM-powered intent parsing so users can reply naturally ("what's the deal with that fundraise?") rather than using rigid commands
- Support reply-by-number ("tell me more about #3") as the fast path, with semantic matching as fallback
- Handle multi-turn follow-ups within a single briefing session (e.g., deep-dive → follow-up question on the deep-dive)
- Deliver responses immediately on the same channel the user replied from
- Gracefully handle non-interaction replies, stale briefing replies, and ambiguous item references

**Non-Goals:**
- General-purpose chatbot or open-ended conversation — the system only handles briefing-related interactions
- Proactive outbound messages beyond the daily briefing and direct responses to user replies
- Voice/phone channel support
- Rich interactive elements in replies (Slack buttons, email action buttons) — this is about free-text reply parsing, not adding more UI to the outbound format
- Real-time streaming of deep-dive responses — response is composed then delivered as a single message

## Decisions

### Decision 1: Unified inbound handler with channel-specific adapters

A single `InboundReplyHandler` processes all incoming replies regardless of channel. Each channel has a thin adapter that normalizes the inbound payload into a common `InboundReply` shape: user identifier, message text, channel type, conversation thread reference, and timestamp. The adapters handle channel-specific concerns (webhook signature verification, thread context extraction) but the core logic is channel-agnostic.

**Adapters:**
- **Email**: SendGrid Inbound Parse or Postmark inbound webhook. Parses the reply text from the email body (stripping quoted reply content and signatures). User identified by from-address matched against user profile.
- **Slack**: Slack Events API `message` event. Replies in the DM thread where the briefing was delivered. User identified by Slack user ID mapped to user profile at OAuth time.
- **SMS**: Twilio webhook on the briefing's sending number. User identified by phone number matched against user profile.
- **WhatsApp**: Twilio WhatsApp webhook. User identified by WhatsApp number matched against user profile.

**Alternative considered**: Separate processing pipelines per channel. Rejected — the parsing and resolution logic is identical; only the I/O adapters differ.

### Decision 2: LLM-powered intent classification with structured output

Each inbound reply is sent to an LLM with the user's most recent briefing items as context. The LLM returns a structured JSON response with:
- `intent`: one of `deep-dive`, `tune-more`, `tune-less`, `already-knew`, `follow-up`, `unrecognized`
- `itemRef`: the resolved briefing item number (1-5) or `null` if ambiguous/not applicable
- `confidence`: 0-1 confidence on the classification
- `freeText`: the user's original message (preserved for follow-up context)

If confidence is below a threshold (0.6), the system asks a clarification question instead of acting. If the intent is `unrecognized`, the system replies with a short help message listing what it can do.

**Alternative considered**: Regex/keyword matching. Rejected — too brittle for natural language. "That second one about the acquisition" wouldn't match any pattern reliably.

### Decision 3: Item numbering in outbound briefings

All outbound briefing formats will include visible item numbers (1-5) so users can reply by number. This is the fastest and most reliable reference mechanism.

- **Email**: number appears as a bold prefix before each item's reason label (e.g., "**1.** PEOPLE ARE TALKING")
- **Slack**: number in the section header
- **SMS**: number prefix per item (e.g., "1. [People are talking] ...")
- **WhatsApp**: number prefix per item

The LLM intent parser uses both the item number (if mentioned) and semantic matching against item content as a fallback when the user doesn't reference a number.

### Decision 4: Conversation session with TTL

Each briefing delivery creates a "reply session" tied to the user and briefing ID. The session stores the briefing items and any follow-up context (previous deep-dive responses). Sessions expire after 24 hours (next briefing replaces the session). This gives the LLM parser the full conversation context when classifying follow-up messages.

Multi-turn example:
1. User: "tell me more about #2" → deep-dive response delivered
2. User: "who's funding them?" → classified as `follow-up`, uses the deep-dive from step 1 as context, responds with a targeted answer
3. User: "less of this kind of thing" → classified as `tune-less` on item #2

**Alternative considered**: Stateless parsing (each reply treated independently). Rejected — "who's funding them?" is meaningless without the prior deep-dive context.

### Decision 5: Response formatting reuses composer channel formatters

Deep-dive responses and feedback acknowledgments are formatted using the same channel-specific formatters from briefing-composer, extended to handle single-item response shapes (not just 5-bullet briefings). This keeps the visual style consistent — a deep-dive reply in email looks like it belongs to the briefing, not like a generic system email.

## Risks / Trade-offs

- **Email reply parsing is messy** — Email clients quote the original message differently, signatures vary wildly, and corporate disclaimers add noise. Mitigation: use a robust reply parser library (e.g., `mailparser` + custom stripping) and feed the full body to the LLM which is tolerant of noise.
- **LLM latency on reply** — Users expect near-instant responses when replying to a message. Intent classification is fast (~1s) but deep-dive generation involves an LLM call that could take 5-10 seconds. Mitigation: send an immediate acknowledgment ("Looking into that...") then deliver the deep-dive as a follow-up message.
- **Spam and abuse** — Inbound webhooks are publicly reachable. Mitigation: verify webhook signatures (SendGrid, Twilio, Slack all provide this), rate-limit per user, reject messages from unknown senders.
- **User identification failures** — A user might reply from a different email address or phone number than what's in their profile. Mitigation: match against all known identifiers in the user profile; if no match, ignore silently (don't leak information to unknown senders).
- **Ambiguous item references** — "Tell me more about the AI thing" when two items mention AI. Mitigation: if the LLM confidence on item resolution is below threshold, ask "Did you mean #2 (the fundraise) or #4 (the new hire)?" and wait for clarification.
