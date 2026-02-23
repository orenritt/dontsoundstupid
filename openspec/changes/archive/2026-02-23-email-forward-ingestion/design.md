## Context

The system already has four signal ingestion layers (syndication, research, events, personal-graph) that operate automatically based on user profile data. Users have no direct mechanism to inject content they've discovered themselves. Meanwhile, the channel-reply-processing capability already handles inbound email via SendGrid/Postmark inbound parse webhooks — so the infrastructure pattern for receiving emails is established.

Users receive content in their inbox constantly: newsletters, forwarded articles from colleagues, industry reports, competitor announcements. Forwarding an email is an action they already know how to do, requiring zero onboarding.

## Goals / Non-Goals

**Goals:**
- Accept forwarded emails and convert them into signals in the existing pipeline
- Correctly identify who forwarded the email and map them to a user account
- Separate the user's annotation ("why I'm forwarding this") from the forwarded content itself
- Extract meaningful content from forwarded emails: body text, embedded URLs, article links
- Ensure user-curated signals receive appropriate provenance weighting in relevance scoring
- Reuse existing inbound email infrastructure from channel-reply-processing

**Non-Goals:**
- Attachment parsing (PDFs, images, spreadsheets) — forwarded email body and links only for v1
- Automatic follow-up or acknowledgment replies to the user (may add later)
- Deduplication against the full signal store at ingestion time — rely on existing scoring-time dedup
- Supporting non-email forwarding channels (Slack forward, SMS) — email only for now
- Summarization or transformation of the forwarded content — store the raw extracted content as the signal

## Decisions

### Decision 1: Reuse inbound parse infrastructure from channel-reply-processing

**Choice**: Use the same SendGrid/Postmark inbound parse webhook setup that channel-reply-processing uses, with a separate receiving address (e.g., `feed@dontsoundstupid.com`).

**Rationale**: The infrastructure for receiving and parsing inbound email already exists. Using a distinct address (rather than routing through the reply address) keeps the intent clear — forwarding to `feed@` means "ingest this content," replying to a briefing means "interact with this item." The webhook handler dispatches to the correct processor based on the receiving address.

**Alternatives considered**: Dedicated IMAP polling (complex, slower, another service to manage), shared address with intent detection (ambiguous — is the user replying to a briefing or forwarding new content?).

### Decision 2: Sender identification via registered email lookup

**Choice**: Match the `From` address of the forwarding email against registered user email addresses in user profiles.

**Rationale**: Simple, reliable, and already available data. Users register with an email, so forwarding from that email is a natural identity signal. No tokens, no special headers.

**Alternatives considered**: Unique per-user forwarding addresses like `feed+userid@` (more complex to provision and explain), magic link in forwarded email (requires user to do extra steps).

### Decision 3: Annotation extraction via forward boundary detection

**Choice**: Parse the email body to find the forward boundary (e.g., "---------- Forwarded message ----------", "Begin forwarded message:", "From: ... Sent: ...") and treat everything above the boundary as the user's annotation, everything below as the forwarded content.

**Rationale**: Email clients use well-known forward boundary markers. This heuristic handles Gmail, Outlook, Apple Mail, and most corporate clients. If no boundary is detected, treat the entire body as content with no annotation.

**Alternatives considered**: Require a structured format like `[NOTE: ...]` (too much friction), LLM-based separation (expensive per-email, overkill for a well-structured problem).

### Decision 4: URL extraction and content enrichment

**Choice**: Extract all URLs from the forwarded content body. For the primary URL (first non-trivial link, or the most prominent one), attempt a lightweight fetch to get the page title and meta description. Store extracted URLs as signal metadata.

**Rationale**: Many forwarded emails are just a link with some context. Extracting and lightly enriching the URL makes the signal more useful downstream for relevance scoring and briefing composition. Full scraping is out of scope — just title and meta description.

**Alternatives considered**: Full page scrape (too heavy, duplicates syndication's job), no URL enrichment (signals from link-only forwards would be too sparse).

### Decision 5: Signal layer and provenance model

**Choice**: Signals created with layer `"email-forward"`. Provenance is tagged directly to the forwarding user with a `"user-curated"` provenance type. The user's annotation text is stored in the signal metadata as `userAnnotation`.

**Rationale**: Using a distinct layer lets downstream systems (relevance scoring, briefing composer) treat user-curated content differently from algorithmically discovered content. The `user-curated` provenance type is a new provenance category that relevance scoring can weight higher than standard provenance.

### Decision 6: Elevated provenance weight for user-curated signals

**Choice**: Add a new provenance category `"user-curated"` to relevance scoring that receives a higher base provenance score than standard feed-derived provenance. The exact weight is configurable alongside other scoring factor weights.

**Rationale**: When a user explicitly forwards something, that is the strongest possible relevance signal — stronger than algorithmic discovery. The provenance factor already exists in scoring; this extends it with a new category rather than adding a new scoring factor.

## Risks / Trade-offs

- **[Spam/abuse]** → Unrecognized sender emails are silently dropped. Rate-limit accepted forwards per user per day to prevent flooding.
- **[Forward format fragility]** → Different email clients use different forward boundary markers. Mitigation: maintain a list of known boundary patterns and fall back to "no annotation" if none match. Monitor unmatched patterns to expand the list.
- **[Content quality variance]** → Forwarded emails range from clean article text to messy HTML newsletters. Mitigation: use html-to-text extraction for the body, don't attempt deep structural parsing. The content is good enough for scoring and composition.
- **[Duplicate signals]** → User forwards an article already captured by syndication. Mitigation: rely on existing scoring-time dedup via content similarity. Both signals may enter the store, but only the highest-scoring one surfaces in the briefing.
- **[No delivery confirmation]** → User forwards an email and doesn't know if it was received. Acceptable for v1; can add acknowledgment emails later.
