## Purpose

Email forward ingestion enables users to inject content into the signal pipeline by forwarding emails to a dedicated service address. The system parses the forwarded content, extracts the user's annotation explaining why they forwarded it, enriches embedded URLs, and creates signals tagged with user-curated provenance. This is the lowest-friction way for users to flag interesting content — no app switching, no URL copying, just forward and optionally annotate.

## Requirements

### Requirement: Inbound Email Receiving

The system MUST accept forwarded emails at a dedicated ingestion address and route them for processing.

#### Scenario: Email received at ingestion address

- **WHEN** an email is received at the designated forwarding address (e.g., `feed@dontsoundstupid.com`)
- **THEN** the system MUST accept the inbound email via the configured email provider's inbound parse webhook
- **AND** MUST pass the parsed email (sender, subject, body text, body HTML, headers) to the email-forward processing pipeline

#### Scenario: Webhook authentication

- **WHEN** an inbound parse webhook request is received
- **THEN** the system MUST validate the request authenticity using the provider's verification mechanism (e.g., signature validation)
- **AND** MUST reject requests that fail verification

### Requirement: Sender Identification

The system MUST identify which user forwarded the email by matching the sender address to a registered account.

#### Scenario: Known sender matched to user

- **WHEN** a forwarded email is received
- **AND** the `From` address matches a registered user's email address
- **THEN** the system MUST associate the email with that user for provenance tagging

#### Scenario: Unrecognized sender

- **WHEN** a forwarded email is received
- **AND** the `From` address does not match any registered user
- **THEN** the system MUST silently discard the email
- **AND** MUST log the unrecognized sender address for monitoring

#### Scenario: Rate limiting per user

- **WHEN** a recognized user forwards emails
- **THEN** the system MUST enforce a configurable daily rate limit per user
- **AND** MUST discard emails that exceed the limit
- **AND** MUST log rate-limited events

### Requirement: Forward Content Parsing

The system MUST parse forwarded emails to separate the user's annotation from the forwarded content.

#### Scenario: Email with standard forward boundary

- **WHEN** a forwarded email body contains a recognized forward boundary marker (e.g., "---------- Forwarded message ----------", "Begin forwarded message:", "From: ... Sent: ...")
- **THEN** the system MUST treat text above the boundary as the user's annotation
- **AND** MUST treat text below the boundary as the forwarded content

#### Scenario: Email with no forward boundary

- **WHEN** a forwarded email body contains no recognized forward boundary marker
- **THEN** the system MUST treat the entire body as forwarded content
- **AND** MUST set the user annotation to empty

#### Scenario: HTML email body extraction

- **WHEN** the forwarded email contains HTML body content
- **THEN** the system MUST extract readable text from the HTML
- **AND** MUST preserve meaningful structure (paragraphs, lists) while stripping formatting

#### Scenario: Empty email body

- **WHEN** a forwarded email has no body content (text or HTML)
- **AND** contains no extractable URLs
- **THEN** the system MUST discard the email
- **AND** MUST log the empty forward event

### Requirement: URL Extraction and Enrichment

The system MUST extract URLs from forwarded content and perform lightweight enrichment on the primary URL.

#### Scenario: URLs extracted from forwarded content

- **WHEN** forwarded content is parsed
- **THEN** the system MUST extract all HTTP/HTTPS URLs from the body text
- **AND** MUST store the extracted URLs as signal metadata

#### Scenario: Primary URL enrichment

- **WHEN** URLs are extracted from forwarded content
- **THEN** the system MUST identify a primary URL (first substantive link, excluding email infrastructure URLs like unsubscribe links)
- **AND** MUST attempt to fetch the page title and meta description for the primary URL
- **AND** MUST include the enriched metadata (title, description) in the signal

#### Scenario: URL enrichment failure

- **WHEN** the primary URL cannot be fetched (timeout, 404, blocked)
- **THEN** the system MUST proceed with signal creation using only the URL itself
- **AND** MUST NOT fail the overall ingestion

### Requirement: Signal Creation

The system MUST create signals from parsed forwarded emails in the shared signal store.

#### Scenario: Signal created from forwarded email

- **WHEN** a forwarded email has been parsed and sender identified
- **THEN** the system MUST create a signal with layer `"email-forward"`
- **AND** the signal MUST include: title (from forwarded email subject or enriched primary URL title), content (forwarded body text), source URL (primary extracted URL if available), user annotation (text the user added above the forward), and extracted URL list
- **AND** the signal MUST be tagged with provenance type `"user-curated"` for the forwarding user

#### Scenario: Signal metadata includes forward context

- **WHEN** a signal is created from a forwarded email
- **THEN** the signal metadata MUST include: the user's annotation text (if any), the original sender of the forwarded email (if parseable from the forward headers), and the forwarding timestamp
