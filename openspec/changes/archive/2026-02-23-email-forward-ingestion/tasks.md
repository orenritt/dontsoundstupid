## 1. Inbound Email Infrastructure

- [x] 1.1 Add inbound parse webhook route that accepts POST requests from the email provider (SendGrid/Postmark)
- [x] 1.2 Implement webhook signature verification to authenticate inbound requests
- [x] 1.3 Parse the inbound webhook payload to extract sender address, subject, text body, HTML body, and headers

## 2. Sender Identification

- [x] 2.1 Implement sender lookup that matches the `From` address against registered user email addresses
- [x] 2.2 Silently discard and log emails from unrecognized senders
- [x] 2.3 Implement per-user daily rate limiting for forwarded emails with configurable threshold

## 3. Forward Content Parsing

- [x] 3.1 Implement forward boundary detection with support for common email client patterns (Gmail, Outlook, Apple Mail)
- [x] 3.2 Split email body into user annotation (above boundary) and forwarded content (below boundary)
- [x] 3.3 Implement HTML-to-text extraction that preserves meaningful structure (paragraphs, lists)
- [x] 3.4 Handle edge case: no boundary found (treat entire body as content, annotation empty)
- [x] 3.5 Handle edge case: empty body with no URLs (discard and log)

## 4. URL Extraction and Enrichment

- [x] 4.1 Extract all HTTP/HTTPS URLs from the forwarded content body
- [x] 4.2 Identify the primary URL (first substantive link, filtering out unsubscribe/infrastructure URLs)
- [x] 4.3 Implement lightweight URL enrichment: fetch page title and meta description for the primary URL
- [x] 4.4 Handle enrichment failures gracefully (timeout, 404, blocked) — proceed with URL only

## 5. Signal Creation

- [x] 5.1 Create signal with layer `"email-forward"` including title, content, source URL, user annotation, and extracted URL list
- [x] 5.2 Tag signal with provenance type `"user-curated"` for the forwarding user
- [x] 5.3 Include forward context metadata: original sender (if parseable), forwarding timestamp

## 6. Relevance Scoring Update

- [x] 6.1 Add `"user-curated"` provenance type to the provenance scoring factor
- [x] 6.2 Assign maximum provenance raw score (1.0) for signals with `"user-curated"` provenance
- [x] 6.3 Include user annotation text in score breakdown metadata for downstream attribution
