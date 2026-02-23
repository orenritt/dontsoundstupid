## Why

Users constantly encounter relevant content — newsletters, industry reports, competitor announcements, articles shared by peers — in their email inbox. Right now there's no way to tell the system "this matters to me" without it being discovered organically through the syndication, research, or events ingestion layers. Forwarding an email is the lowest-friction gesture possible: no context switch, no URL copying, no app login. The user just forwards to a known address, optionally adds a note about why it's interesting, and it enters the signal pipeline as a high-confidence user-curated signal.

## What Changes

- Define an inbound email ingestion endpoint that receives forwarded emails at a dedicated service address (e.g., `feed@dontsoundstupid.com`)
- Identify the forwarding user from their sender address mapped to their account
- Parse the forwarded email to extract: the original content (article text, newsletter body), any URLs/links embedded in the forwarded message, and the user's annotation (text they added above the forwarded content explaining why they're forwarding it)
- Create signals from extracted content with layer "email-forward", tagged with the user's annotation as context and weighted as user-curated (direct provenance)
- Handle edge cases: unrecognized senders, empty forwards, duplicate content already in the signal store, malformed emails, attachments

## Capabilities

### New Capabilities
- `email-forward-ingestion`: Inbound email receiving, sender identification, forwarded content parsing, annotation extraction, and signal creation from user-forwarded emails

### Modified Capabilities
- `relevance-scoring`: User-forwarded signals carry explicit user intent and should receive elevated provenance scoring — the user literally told us this matters

## Impact

- New inbound email processing infrastructure (e.g., SendGrid/Postmark inbound parse webhook — same infrastructure pattern as channel-reply-processing)
- New email parsing logic to separate user annotation from forwarded content and extract embedded links
- Signal store receives a new signal layer ("email-forward") with user annotation metadata
- Relevance scoring config needs a provenance weight adjustment for user-curated signals
- Depends on existing: user profile (email-to-account mapping), signal store, relevance-scoring
