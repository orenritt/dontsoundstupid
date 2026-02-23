## Why

Briefings are delivered on email, Slack, SMS, and WhatsApp — but right now the interaction layer (deep-dives, "more of this," "less of this") only works in the web app's briefing reader. Users should be able to reply directly on the channel where they received the briefing and get an immediate response, without switching context to the app. This is the missing piece that makes the channel delivery genuinely conversational rather than read-only.

## What Changes

- Define an inbound message routing system that receives replies from each delivery channel (email inbound parse, Slack events, Twilio SMS/WhatsApp webhooks)
- Define an LLM-powered intent parser that classifies free-text replies into interaction types: deep-dive request, positive tuning, negative tuning, "already knew this," follow-up question, or unrecognized
- Define a briefing item resolver that maps ambiguous natural-language replies back to a specific briefing item using item numbering, keyword/semantic matching, and recency heuristics
- Define a response formatter that renders deep-dive responses and feedback acknowledgments back to the originating channel in the appropriate format
- Add item numbering to outbound briefing formatting so users can reference items by number in replies
- Handle edge cases: replies to old briefings, ambiguous matches, multi-turn follow-ups, non-interaction replies ("thanks," "unsubscribe")

## Capabilities

### New Capabilities
- `channel-reply-processing`: Inbound message routing, intent parsing, briefing item resolution, and response delivery for user replies on delivery channels

### Modified Capabilities
- `briefing-composer`: Outbound briefing formatting must include item numbering to support reply-by-number on all channels
- `briefing-interaction`: Interaction requirements must explicitly cover channel-native replies, not just web app interactions

## Impact

- New inbound webhook/listener infrastructure per channel (SendGrid/Postmark inbound parse, Slack Events API, Twilio webhooks)
- New LLM prompt for intent classification and item resolution from free-text
- Modifications to briefing composer's channel formatters to include item numbers
- Modifications to briefing interaction spec to define channel-reply scenarios
- Depends on existing: briefing-composer (outbound formatting), briefing-interaction (deep-dive and feedback handlers), user-profile (channel config)
