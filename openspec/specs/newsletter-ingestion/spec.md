# newsletter-ingestion Specification

## Purpose

Newsletter ingestion enables users to add professional newsletters to their content universe. Newsletters with RSS feeds are ingested through the existing syndication polling infrastructure. Newsletters without feeds use a shared system email address — an admin subscribes the email, inbound emails are processed via webhook, and an LLM extracts individual stories from each edition. All newsletter signals receive provenance records for subscribed users, integrating with the scoring agent's relevance boosting.

## Requirements

### Requirement: Newsletter Registry

The system MUST maintain a central registry of newsletters shared across all users. Each newsletter is stored once regardless of how many users subscribe to it.

#### Scenario: Newsletter registry entry structure

- **WHEN** a newsletter is added to the registry (by admin or auto-discovery)
- **THEN** the entry MUST include: unique ID, name, description (for LLM matching), website URL, industry tags (JSONB array), ingestion method (`"rss"`, `"system_email"`, or `"pending"`), feed URL (nullable), syndication feed ID (nullable FK to `syndication_feeds`), system email address (nullable), status (`"active"`, `"pending_admin_setup"`, or `"inactive"`), logo URL (nullable), created and updated timestamps

#### Scenario: One registry entry per newsletter

- **WHEN** multiple users request the same newsletter
- **THEN** the system MUST NOT create duplicate registry entries
- **AND** MUST link each user to the single existing entry via the subscription table

#### Scenario: Registry seeded by admin

- **WHEN** an admin adds a newsletter to the registry
- **THEN** the admin MUST provide at minimum: name, description, and industry tags
- **AND** the admin MUST set the ingestion method and activate the newsletter

### Requirement: User Newsletter Subscriptions

The system MUST track which newsletters each user has added to their content universe via a join table linking users to newsletter registry entries.

#### Scenario: User subscribes to newsletter

- **WHEN** a user adds a newsletter to their content universe (during onboarding or via settings)
- **THEN** the system MUST create a `user_newsletter_subscriptions` record linking the user ID to the newsletter registry ID
- **AND** MUST record the timestamp of subscription

#### Scenario: User unsubscribes from newsletter

- **WHEN** a user removes a newsletter from their content universe
- **THEN** the system MUST delete the corresponding subscription record
- **AND** MUST NOT affect other users' subscriptions to the same newsletter
- **AND** MUST NOT remove the newsletter from the registry

#### Scenario: Subscription drives signal relevance

- **WHEN** the scoring agent evaluates signals for a user
- **THEN** signals originating from newsletters the user subscribes to MUST have provenance records that provide a relevance boost
- **AND** signals from newsletters the user does not subscribe to MUST NOT receive newsletter-based provenance boost for that user

### Requirement: RSS Newsletter Ingestion

The system MUST ingest newsletters that have discoverable RSS/Atom feeds through the existing syndication polling infrastructure.

#### Scenario: RSS newsletter registered

- **WHEN** a newsletter has a discoverable RSS feed (Substack, Ghost, Beehiiv, Buttondown, or standard RSS/Atom)
- **THEN** the system MUST create or link to a `syndication_feeds` entry for that feed URL
- **AND** MUST set the newsletter registry's `ingestion_method` to `"rss"` and `syndication_feed_id` to the feed entry's ID
- **AND** the existing syndication polling infrastructure MUST handle all subsequent feed polling

#### Scenario: RSS newsletter signals receive newsletter provenance

- **WHEN** the syndication layer creates signals from an RSS newsletter feed
- **THEN** the system MUST create provenance records with `trigger_reason: "newsletter-subscription"` for every user subscribed to that newsletter
- **AND** MUST set `profile_reference` to the newsletter registry name

### Requirement: System Email Newsletter Ingestion

The system MUST ingest newsletters without RSS feeds via a shared system email address. One system email subscription per newsletter serves all users who subscribe to that newsletter.

#### Scenario: Inbound newsletter email received

- **WHEN** an email arrives at the newsletter ingestion domain (e.g., `*@newsletters.dontsoundstupid.com`)
- **THEN** the system MUST accept the email via the inbound email webhook at `/api/newsletter-ingest/webhook`
- **AND** MUST identify the newsletter by matching the recipient address against `system_email_address` in the newsletter registry

#### Scenario: Unknown recipient address

- **WHEN** an email arrives at the newsletter ingestion domain
- **AND** the recipient address does not match any newsletter registry entry
- **THEN** the system MUST silently discard the email
- **AND** MUST log the unrecognized recipient address for monitoring

#### Scenario: Newsletter from inactive registry entry

- **WHEN** an email arrives matching a newsletter with status `"pending_admin_setup"` or `"inactive"`
- **THEN** the system MUST discard the email
- **AND** MUST log the event for admin awareness

#### Scenario: Webhook authentication

- **WHEN** an inbound email webhook request is received at `/api/newsletter-ingest/webhook`
- **THEN** the system MUST validate request authenticity using the provider's verification mechanism
- **AND** MUST reject requests that fail verification

### Requirement: LLM Story Extraction

The system MUST use an LLM to extract individual stories from newsletter email bodies. Each story becomes a separate signal.

#### Scenario: Story extraction from newsletter body

- **WHEN** a newsletter email is received and the newsletter is identified
- **THEN** the system MUST convert the email HTML body to text (stripping tracking pixels, unsubscribe chrome, and formatting)
- **AND** MUST send the text to an LLM with instructions to extract individual stories
- **AND** the LLM MUST return a JSON array of stories, each with: title, summary (1-2 sentences), source URL (if referenced in the newsletter), and source label (publication name)

#### Scenario: Signal creation per extracted story

- **WHEN** the LLM returns extracted stories from a newsletter
- **THEN** the system MUST create one signal per story with layer `"newsletter"`
- **AND** each signal MUST include: title, content (the story summary), source URL, and metadata containing the newsletter registry ID, newsletter name, and extraction timestamp
- **AND** the system MUST create provenance records for all users subscribed to that newsletter with `trigger_reason: "newsletter-subscription"` and `profile_reference` set to the newsletter name

#### Scenario: LLM extraction failure

- **WHEN** the LLM fails to extract stories (API error, malformed response, timeout)
- **THEN** the system MUST log the failure with the newsletter ID and email content
- **AND** MUST NOT create partial or corrupted signals
- **AND** MUST NOT retry automatically (the next newsletter edition will be processed normally)

#### Scenario: Empty newsletter

- **WHEN** the LLM determines the newsletter body contains no extractable stories (e.g., purely promotional content, confirmation emails)
- **THEN** the system MUST NOT create any signals
- **AND** MUST log that zero stories were extracted

### Requirement: Newsletter Signal Deduplication

The system MUST prevent duplicate signals when newsletter content overlaps with signals from other ingestion layers.

#### Scenario: Cross-layer deduplication

- **WHEN** a newsletter story is extracted that covers the same event as an existing signal from another layer (news, syndication, etc.)
- **THEN** the system MUST use the existing cross-layer dedup mechanism (semantic similarity check) to link rather than duplicate
- **AND** MUST add newsletter provenance to the existing signal rather than creating a new one

#### Scenario: Same-newsletter deduplication

- **WHEN** the same newsletter email is received more than once (provider retry, duplicate delivery)
- **THEN** the system MUST NOT create duplicate signals
- **AND** MUST use source URL uniqueness or content hashing to detect duplicates

### Requirement: Admin Newsletter Management

The system MUST provide admin capabilities to manage the newsletter registry and process pending requests.

#### Scenario: Admin views pending requests

- **WHEN** an admin accesses the newsletter management interface
- **THEN** the system MUST display all newsletters with status `"pending_admin_setup"` sorted by request count (number of users who requested it)
- **AND** MUST show the newsletter name, requesting user count, and submission timestamp

#### Scenario: Admin activates system-email newsletter

- **WHEN** an admin activates a pending newsletter for system email ingestion
- **THEN** the admin MUST provide a system email slug (e.g., `money-stuff`)
- **AND** the system MUST set `system_email_address` to `{slug}@newsletters.dontsoundstupid.com`
- **AND** MUST set `ingestion_method` to `"system_email"` and `status` to `"active"`
- **AND** the admin MUST manually subscribe that email address to the newsletter externally

#### Scenario: Admin activates RSS newsletter

- **WHEN** an admin activates a pending newsletter and provides an RSS feed URL
- **THEN** the system MUST validate the feed URL by attempting to parse it
- **AND** MUST create a `syndication_feeds` entry and link it via `syndication_feed_id`
- **AND** MUST set `ingestion_method` to `"rss"` and `status` to `"active"`

#### Scenario: Admin deactivates newsletter

- **WHEN** an admin deactivates a newsletter
- **THEN** the system MUST set the status to `"inactive"`
- **AND** MUST NOT delete existing signals or user subscriptions
- **AND** MUST stop ingesting new content for that newsletter

#### Scenario: Stale system-email newsletter detection

- **WHEN** a system-email newsletter has not received any email for 30+ days
- **THEN** the system MUST flag the newsletter for admin review
- **AND** MUST NOT automatically deactivate it
