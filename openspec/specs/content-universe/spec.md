# content-universe Specification

## Purpose
TBD - created by syncing delta specs from change content-universe-filtering.

## Requirements

### Requirement: Content Universe Definition

The system MUST maintain a derived content universe for each user — a structured definition of what content is in scope for their briefings and what is explicitly excluded.

#### Scenario: Content universe structure

- **WHEN** a content universe is generated for a user
- **THEN** it MUST be stored as a structured JSON object containing:
  - `definition`: A 2-4 sentence prose description of the user's exact professional niche and content scope
  - `coreTopics`: An array of intersectional topic descriptors that capture the user's specific niche position (e.g., "parametric insurance for ecosystem restoration"), NOT parent categories (e.g., NOT "insurtech")
  - `exclusions`: An array of explicit parent categories, adjacent fields, and common misattributions that MUST be rejected (e.g., "general insurtech", "cyber insurance", "embedded insurance")
  - `seismicThreshold`: A prose description of the narrow criteria under which content outside the universe may be admitted (e.g., "Only if a top-10 global insurer enters the nature-based insurance space")
  - `generatedAt`: ISO timestamp of when the universe was generated
  - `generatedFrom`: Array of profile field names that contributed to generation
  - `version`: Integer version number, incremented on each regeneration

#### Scenario: Content universe is not user-facing

- **WHEN** a content universe exists for a user
- **THEN** the system MUST NOT expose the content universe definition, exclusions, or seismic threshold to the user through any UI
- **AND** the content universe MUST be entirely system-managed

### Requirement: Content Universe Generation

The system MUST generate the content universe from the user's full profile context using an LLM.

#### Scenario: Generation inputs

- **WHEN** content universe generation is triggered
- **THEN** the system MUST provide the LLM with: the user's conversation transcript (raw language), parsedTopics, parsedInitiatives, parsedConcerns, parsedExpertAreas, parsedWeakAreas, parsedKnowledgeGaps, title, company, impress list companies and contact focus areas, peer organization names, and rapid-fire classifications
- **AND** the LLM MUST produce intersectional coreTopics that reflect the user's specific niche at the intersection of their profile signals, NOT independent keywords or parent categories
- **AND** the LLM MUST produce an exclusion list of parent categories and adjacent fields that are commonly confused with or subsume the user's actual niche

#### Scenario: Exclusion derivation from rapid-fire classifications

- **WHEN** the user's rapid-fire classifications include topics marked "not-relevant"
- **THEN** each "not-relevant" topic MUST be included in the content universe's exclusion list
- **AND** the LLM MUST use "not-relevant" classifications as strong signals for what adjacent fields the user does NOT care about

#### Scenario: Generation quality for sparse profiles

- **WHEN** the user's profile has fewer than 3 parsed topics and fewer than 2 initiatives
- **THEN** the system MUST generate a content universe with wider scope (broader coreTopics, fewer exclusions)
- **AND** the seismic threshold MUST be more permissive to avoid empty briefings
- **AND** the system MUST record `generatedFrom` as the subset of fields that had content

### Requirement: Content Universe Refresh Lifecycle

The system MUST regenerate the content universe at specific trigger points to keep it aligned with the user's evolving profile.

#### Scenario: Initial generation after onboarding

- **WHEN** a user completes onboarding (all profile fields populated, rapid-fire classifications complete)
- **THEN** the system MUST generate the user's first content universe with version 1
- **AND** the pipeline MUST NOT run for a user who lacks a content universe (graceful fallback to current behavior until generated)

#### Scenario: Regeneration on profile update

- **WHEN** a user's parsedTopics, parsedInitiatives, parsedConcerns, or rapidFireClassifications change
- **THEN** the system MUST regenerate the content universe with an incremented version number
- **AND** MUST preserve existing exclusions unless the profile change explicitly contradicts them

#### Scenario: Regeneration from feedback accumulation

- **WHEN** 3 or more "tune-less" or "not-relevant" feedback signals have accumulated since the last content universe generation
- **THEN** the system MUST regenerate the content universe, incorporating the feedback topics as exclusion candidates
- **AND** the regenerated exclusion list MUST be a superset of the previous exclusion list plus the new exclusion candidates (exclusions are additive, never removed)

#### Scenario: Idempotent regeneration

- **WHEN** content universe regeneration is triggered but profile inputs have not materially changed since the last generation
- **THEN** the system MUST NOT increment the version number
- **AND** MUST update `generatedAt` to record that regeneration was attempted

### Requirement: Seismic Event Exception

The content universe gate MUST allow a narrow exception for events of extraordinary magnitude that fall outside the user's defined content universe.

#### Scenario: Seismic event criteria

- **WHEN** a candidate signal is outside the user's content universe (not matching any coreTopics, matching one or more exclusions)
- **THEN** the signal MUST be rejected UNLESS all of the following are true:
  1. The signal involves a specific, named entity (company, regulator, person) — not a trend, opinion, or report
  2. The event is concrete and verifiable (acquisition, regulatory ruling, leadership change, bankruptcy, market entry)
  3. The event would directly change what the user does, says, or decides within the current week
  4. A colleague working in the user's exact niche would mention this event unprompted

#### Scenario: Seismic event examples

- **WHEN** the scoring agent evaluates a signal outside the content universe
- **THEN** a signal like "Lloyd's of London announces dedicated nature-based insurance syndicate" MUST pass the seismic gate for a nature-based insurance professional (concrete entity, concrete event, changes their competitive landscape)
- **AND** a signal like "McKinsey publishes report on insurtech trends mentioning nature-based solutions" MUST NOT pass the seismic gate (a mention in a broad report is not seismic)
- **AND** a signal like "AI is transforming the insurance industry" MUST NOT pass the seismic gate (no named entity, no concrete event, opinion piece)
