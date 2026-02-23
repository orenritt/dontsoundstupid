## MODIFIED Requirements

### Requirement: Feed Auto-Discovery

The system MUST discover RSS/Atom feeds from domains and URLs, including platform-aware patterns for major newsletter platforms.

#### Scenario: Feed auto-discovery from domain

- **WHEN** a domain is identified as a feed source
- **THEN** the system MUST attempt RSS/Atom feed discovery via standard paths (/feed, /rss, /atom.xml, link rel tags)
- **AND** if no feed is found, MUST register the domain for scrape+diff fallback

#### Scenario: Platform-aware newsletter feed discovery

- **WHEN** a URL is submitted for feed discovery
- **AND** the URL matches a known newsletter platform pattern
- **THEN** the system MUST try the platform-specific feed URL pattern before falling back to generic discovery:
  - Substack (`substack.com`): append `/feed` to publication base URL
  - Buttondown (`buttondown.com`): construct `https://buttondown.com/{name}/rss`
- **AND** MUST validate the discovered feed by attempting to parse it

#### Scenario: Feed deduplication with newsletter registry

- **WHEN** a feed is discovered for a newsletter
- **AND** the feed URL already exists in `syndication_feeds`
- **THEN** the system MUST reuse the existing feed entry
- **AND** MUST link the newsletter registry entry to the existing feed via `syndication_feed_id`
- **AND** MUST NOT create a duplicate feed subscription

### Requirement: RSS/Atom Polling

The system MUST poll RSS/Atom feeds on a configurable schedule and ingest new items as signals.

#### Scenario: Scheduled feed polling

- **WHEN** a feed's poll interval has elapsed
- **THEN** the system MUST fetch the feed and compare against last-fetched state
- **AND** MUST ingest only new items as signals with layer "syndication"

#### Scenario: Feed item ingestion

- **WHEN** a new feed item is detected
- **THEN** the system MUST create a signal with: title, content (full text if available, summary otherwise), source URL, publication date, and feed-specific metadata (author, categories, feed URL)
- **AND** MUST tag the signal with provenance for all users subscribed to that feed

#### Scenario: Newsletter-linked feed provenance

- **WHEN** a new feed item is ingested from a feed that is linked to a newsletter registry entry (via `syndication_feed_id`)
- **THEN** the system MUST additionally create provenance records with `trigger_reason: "newsletter-subscription"` for all users subscribed to that newsletter in `user_newsletter_subscriptions`
- **AND** MUST set `profile_reference` to the newsletter name from the registry

#### Scenario: Feed error handling

- **WHEN** a feed poll fails (timeout, 404, parse error)
- **THEN** the system MUST record the failure and retry with exponential backoff
- **AND** MUST NOT remove the feed subscription on transient errors
- **AND** MUST flag feeds with repeated failures for review
