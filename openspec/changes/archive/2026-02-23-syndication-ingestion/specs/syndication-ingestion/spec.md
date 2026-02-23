## ADDED Requirements

### Requirement: Feed Management

The system MUST manage a registry of RSS/Atom feeds and scrape targets derived from user profiles.

#### Scenario: Feeds derived from user profile

- **WHEN** a user profile is created or updated
- **THEN** the system MUST identify candidate feed sources from: peer org domains, impress list company blogs, industry publications matching intelligence goals
- **AND** MUST add discovered feeds to the feed registry

#### Scenario: Feed auto-discovery

- **WHEN** a domain is identified as a feed source
- **THEN** the system MUST attempt RSS/Atom feed discovery via standard paths (/feed, /rss, /atom.xml, link rel tags)
- **AND** if no feed is found, MUST register the domain for scrape+diff fallback

#### Scenario: Feed deduplication

- **WHEN** multiple users trigger the same feed source
- **THEN** the system MUST maintain a single feed subscription
- **AND** MUST track all users associated with that feed for provenance tagging

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

#### Scenario: Feed error handling

- **WHEN** a feed poll fails (timeout, 404, parse error)
- **THEN** the system MUST record the failure and retry with exponential backoff
- **AND** MUST NOT remove the feed subscription on transient errors
- **AND** MUST flag feeds with repeated failures for review

### Requirement: Scrape+Diff Fallback

The system MUST support content change detection for sources without RSS/Atom feeds.

#### Scenario: Scrape target registered

- **WHEN** a domain has no discoverable RSS/Atom feed
- **THEN** the system MUST register specific pages (blog index, news page, press releases) as scrape targets

#### Scenario: Content diff detection

- **WHEN** a scrape target is polled
- **THEN** the system MUST fetch the page content, diff against the previous snapshot, and identify new entries
- **AND** MUST create signals for genuinely new content only (not layout changes or minor edits)

#### Scenario: Rate limiting and politeness

- **WHEN** scraping external sites
- **THEN** the system MUST respect robots.txt directives
- **AND** MUST rate-limit requests to avoid overloading target servers
