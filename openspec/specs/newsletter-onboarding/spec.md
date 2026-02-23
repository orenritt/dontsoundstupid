# newsletter-onboarding Specification

## Purpose

Newsletter onboarding presents users with LLM-ranked newsletter suggestions during the onboarding flow, personalized to their role and context. Users can add newsletters to their content universe with a single tap, submit newsletters not in the registry via URL or name, and manage their subscriptions post-onboarding in settings.

## Requirements

### Requirement: LLM-Ranked Newsletter Suggestions

The system MUST use an LLM to rank newsletters from the registry by relevance to the user's specific profile, presenting suggestions ordered from most specifically relevant to generally useful.

#### Scenario: Newsletter ranking triggered after profile is built

- **WHEN** the user completes the calendar connect step (or skips it) during onboarding
- **THEN** the system MUST send the user's full profile (role, company, conversation-derived context, rapid-fire classifications, peer organizations, impress list) along with all active newsletters from the registry to an LLM
- **AND** the LLM MUST return a ranked list of newsletters ordered from most specifically relevant to the user's role and context, down to generally useful for their industry
- **AND** each suggestion MUST include a short "why" explanation specific to the user (e.g., "Covers the exact deal structures you work with", not generic descriptions)

#### Scenario: Registry too small for meaningful ranking

- **WHEN** the newsletter registry contains fewer than 3 active newsletters
- **THEN** the system MUST display all available newsletters without LLM ranking
- **AND** MUST still show the newsletter name and description

#### Scenario: LLM ranking failure

- **WHEN** the LLM fails to produce a ranked list (API error, timeout, malformed response)
- **THEN** the system MUST fall back to displaying newsletters sorted by popularity (subscription count)
- **AND** MUST NOT block onboarding progression

### Requirement: Newsletter Suggestion UI

The system MUST present newsletter suggestions as a card-based step during onboarding, consistent with the card-phase UI pattern (Steps 4-7).

#### Scenario: Suggestion cards displayed

- **WHEN** the newsletter suggestion step is reached
- **THEN** the system MUST display each suggested newsletter as a card showing: newsletter name, newsletter description, and the LLM-generated "why" line specific to the user
- **AND** each card MUST have an "Add to my content universe" button
- **AND** the cards MUST be presented in the LLM-ranked order (most relevant first)

#### Scenario: User adds newsletter

- **WHEN** the user taps "Add to my content universe" on a newsletter card
- **THEN** the system MUST create a `user_newsletter_subscriptions` record linking the user to that newsletter
- **AND** the button MUST change to a "Added" confirmation state (filled, with checkmark)
- **AND** the user MUST be able to undo (tap again to remove)

#### Scenario: No newsletters added

- **WHEN** the user reaches the newsletter step but adds none
- **THEN** the system MUST allow the user to continue to the next step without adding any newsletters
- **AND** MUST NOT block or penalize progression

#### Scenario: Step is skippable

- **WHEN** the newsletter suggestion step is presented
- **THEN** a "Skip" or "Continue" link MUST be visible
- **AND** tapping it MUST advance to the profile complete step without requiring any newsletter selections

### Requirement: User-Submitted Newsletter Handling

The system MUST accept newsletter submissions from users who don't find their newsletter in the suggestions, via a "Don't see yours?" input.

#### Scenario: User submits a Substack URL

- **WHEN** the user pastes a URL containing `substack.com` into the "Don't see yours?" input
- **THEN** the system MUST attempt feed discovery by appending `/feed` to the publication base URL
- **AND** if a valid feed is found, MUST create a newsletter registry entry with `ingestion_method: "rss"`, create the corresponding `syndication_feeds` entry, and subscribe the user
- **AND** MUST show confirmation: "Found it! Added to your content universe."

#### Scenario: User submits a generic RSS/website URL

- **WHEN** the user pastes a non-Substack URL into the input
- **THEN** the system MUST attempt feed discovery using the existing platform-aware discovery logic (HTML link tags, common paths, platform patterns)
- **AND** if a valid feed is found, MUST create a newsletter registry entry with `ingestion_method: "rss"` and subscribe the user
- **AND** if no feed is found, MUST create a registry entry with `status: "pending_admin_setup"` and subscribe the user
- **AND** if pending, MUST show: "We'll get this set up for you. You'll start seeing content once it's activated."

#### Scenario: User submits a plain name

- **WHEN** the user types a newsletter name (no URL detected) into the input
- **THEN** the system MUST first check the existing registry for a case-insensitive name match
- **AND** if a match is found, MUST subscribe the user to the existing entry
- **AND** if no match, MUST create a registry entry with `status: "pending_admin_setup"`, `ingestion_method: "pending"`, and the submitted name
- **AND** MUST subscribe the user to the new entry
- **AND** MUST show: "We'll get this set up for you. You'll start seeing content once it's activated."

#### Scenario: Duplicate submission

- **WHEN** the user submits a URL or name that matches an existing registry entry (by feed URL, website URL, or name)
- **THEN** the system MUST NOT create a duplicate registry entry
- **AND** MUST subscribe the user to the existing entry
- **AND** MUST show confirmation that the newsletter was added

### Requirement: Post-Onboarding Newsletter Management

The system MUST allow users to manage their newsletter subscriptions after onboarding is complete.

#### Scenario: View subscribed newsletters in settings

- **WHEN** the user navigates to their settings
- **THEN** the system MUST display all newsletters in their content universe with name, description, and status (active vs pending setup)
- **AND** MUST provide a remove option for each newsletter

#### Scenario: Add newsletters from settings

- **WHEN** the user wants to add a newsletter from settings
- **THEN** the system MUST provide the same "Don't see yours?" input as during onboarding (accepts URL or name)
- **AND** MUST follow the same auto-discovery and pending-request logic

#### Scenario: Browse available newsletters from settings

- **WHEN** the user wants to discover new newsletters from settings
- **THEN** the system MUST display available newsletters from the registry that the user has not yet subscribed to
- **AND** MUST allow adding via the same "Add to my content universe" interaction
