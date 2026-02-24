# user-profile Specification

## Purpose
TBD - created by archiving change user-profile-model. Update Purpose after archive.
## Requirements
### Requirement: Identity Layer

The system MUST maintain a stable identity layer sourced from enrichment APIs. This data is fetched once and refreshed periodically.

#### Scenario: Person enrichment from LinkedIn URL

- **WHEN** a user provides their LinkedIn URL
- **THEN** the system MUST call the person enrichment API (Proxycurl) and extract: name, headline, current role, current company, location, skills, past roles, education

#### Scenario: Impress list enrichment

- **WHEN** a user provides LinkedIn URLs for people they want to impress (boss, board members, investors, clients, mentors, etc.)
- **THEN** the system MUST enrich each person's profile with: name, headline, current role, company, skills, recent activity
- **AND** store them in the user's impress list with source "core" and status "active"

#### Scenario: Company enrichment from company name

- **WHEN** person enrichment returns a company name/domain
- **THEN** the system MUST call the company enrichment API (Clearbit/Crunchbase) and extract: company size, industry, funding stage, tech stack, job postings, known peer organizations

### Requirement: Context Layer

The system MUST maintain a dynamic context layer sourced from user conversation. This layer evolves as the user's work changes and includes a derived content universe.

#### Scenario: Context fields populated from onboarding

- **WHEN** the onboarding conversation completes
- **THEN** the profile MUST contain: current initiatives/projects, key concerns, important terms/topics, geographic relevance, knowledge gaps, and intelligence goals
- **AND** the system MUST trigger content universe generation after all profile fields are populated

#### Scenario: Context is updatable

- **WHEN** a user updates their initiatives, concerns, focus areas, or intelligence goals
- **THEN** the context layer MUST reflect the changes without affecting the identity layer
- **AND** the system MUST trigger content universe regeneration if parsedTopics, parsedInitiatives, parsedConcerns, or rapidFireClassifications changed

#### Scenario: Context evolves from briefing feedback

- **WHEN** a user provides tuning feedback through briefing interactions
- **THEN** the context layer MUST incorporate learned relevance adjustments
- **AND** accumulated feedback MUST refine the derived relevance keywords used for signal matching
- **AND** when 3 or more "tune-less" or "not-relevant" feedback signals accumulate since the last content universe generation, the system MUST trigger content universe regeneration with those feedback topics as exclusion candidates

### Requirement: Peer Organizations

The system MUST identify and track organizations similar to the user's, informed by all available enrichment and conversation data.

#### Scenario: System suggests peer organizations

- **WHEN** enrichment data and onboarding conversation are complete
- **THEN** the system MUST research and infer a list of candidate peer organizations based on industry, geography, size, mission, and the user's described work
- **AND** present them to the user for confirmation

#### Scenario: User confirms or adjusts peers

- **WHEN** the user is shown suggested peer organizations
- **THEN** they MUST be able to accept, reject, or add organizations for each suggestion
- **AND** they MUST be able to optionally add a comment explaining the relationship ("they're bigger but same market", "direct competitor in our region", etc.)
- **AND** confirmed peers and comments MUST be stored in the context layer

### Requirement: Unified Profile

The system MUST provide a unified profile that combines all layers for the briefing engine.

#### Scenario: Profile serves the briefing engine

- **WHEN** the briefing engine requests a user profile
- **THEN** it MUST receive a unified object combining identity and context layers
- **AND** the profile MUST include: the user's identity, their impress list, confirmed peer organizations (with comments), derived relevance keywords for signal matching, calendar connection status with upcoming meeting data when available, and the user's content universe (definition, coreTopics, exclusions, seismicThreshold)

### Requirement: Delivery Preferences

The system MUST store the user's preferred delivery channel, timing, and format as part of their profile.

#### Scenario: Delivery channel selection

- **WHEN** a user selects a delivery channel during onboarding
- **THEN** the profile MUST store the selected channel (email, Slack, SMS, or WhatsApp)
- **AND** MUST store any channel-specific configuration (e.g., email address, Slack workspace/channel, phone number)

#### Scenario: Delivery time selection

- **WHEN** a user specifies their preferred delivery time
- **THEN** the profile MUST store the time and timezone
- **AND** the briefing engine MUST use this to schedule delivery

#### Scenario: Format preference

- **WHEN** a user selects a briefing format
- **THEN** the profile MUST store the preference (concise: 3-5 bullets, standard: summary with context, detailed: full briefing with links and sources)

#### Scenario: Delivery preferences are updatable

- **WHEN** a user changes their delivery channel, time, or format
- **THEN** the profile MUST reflect the updated preferences without affecting other profile data

### Requirement: Calendar Connection Status

The user profile MUST track whether a calendar is connected and its sync state.

#### Scenario: Profile includes calendar status

- **WHEN** a user connects a calendar
- **THEN** the profile MUST store: calendar provider (Google or Outlook), connection status (connected/disconnected), last sync timestamp

#### Scenario: Profile without calendar

- **WHEN** a user has not connected a calendar
- **THEN** the profile MUST indicate calendar is not connected
- **AND** all other profile features MUST function normally

### Requirement: Intelligence Goals

The system MUST store the user's intelligence goals — the specific dimensions of staying informed that matter most to them.

#### Scenario: User selects intelligence goals

- **WHEN** a user selects their intelligence goals during onboarding or profile update
- **THEN** the profile context layer MUST store the selected goals
- **AND** each goal MUST have a category identifier and optional user-provided detail

#### Scenario: Predefined goal categories

- **WHEN** the system presents intelligence goal options
- **THEN** it MUST offer at least the following categories: industry trends, new jargon/terminology, new entrants/products, best practices, research/papers, regulatory/policy changes, competitive intelligence, network intelligence
- **AND** MUST allow the user to add custom goals beyond the predefined list

#### Scenario: Intelligence goals are updatable

- **WHEN** a user modifies their intelligence goals
- **THEN** the context layer MUST reflect the updated goals
- **AND** the previous goals MUST be preserved in the context history snapshot

### Requirement: Feedback History

The user profile MUST store a history of briefing interactions to learn user preferences over time.

#### Scenario: Deep-dive interactions stored

- **WHEN** a user requests a deep-dive on a briefing item
- **THEN** the profile MUST store: the briefing item ID, topic/category, timestamp, and interaction type (deep-dive)

#### Scenario: Tuning feedback stored

- **WHEN** a user provides tuning feedback on a briefing item
- **THEN** the profile MUST store: the briefing item ID, topic/category, feedback direction (more/less), timestamp, and optional user comment

#### Scenario: Feedback informs relevance model

- **WHEN** the briefing engine generates a new briefing
- **THEN** it MUST consult the user's feedback history to adjust relevance weighting
- **AND** recent feedback MUST carry more weight than older feedback

### Requirement: Dynamic Impress List

The impress list MUST support multiple tiers and be modifiable at any time after onboarding. Each contact MUST carry structured deep-dive research data and a research status.

#### Scenario: Core contacts from onboarding

- **WHEN** a user adds people during onboarding
- **THEN** each person MUST be stored as a core impress contact with source "onboarding"
- **AND** core contacts MUST persist until explicitly removed by the user
- **AND** the system MUST trigger an asynchronous deep-dive research job for each contact

#### Scenario: User adds new impress contact post-onboarding

- **WHEN** a user provides a new LinkedIn URL to add to their impress list
- **THEN** the system MUST enrich the person's profile
- **AND** MUST add them as a core impress contact with source "user-added"
- **AND** MUST trigger an asynchronous deep-dive research job for the contact
- **AND** MUST return the contact immediately with `researchStatus: "pending"`

#### Scenario: User removes an impress contact

- **WHEN** a user removes a person from their impress list
- **THEN** the person MUST be marked as inactive
- **AND** MUST no longer influence briefing relevance
- **AND** the removal MUST be recorded in context history

#### Scenario: Temporary contacts from calendar

- **WHEN** a calendar meeting has enriched attendees
- **THEN** those attendees MUST be treated as temporary impress contacts for the period surrounding the meeting
- **AND** temporary contacts MUST influence briefing relevance only within their active window

#### Scenario: Temporary contacts expire

- **WHEN** a meeting has passed
- **THEN** the associated temporary impress contacts MUST expire and stop influencing briefing relevance
- **AND** the system MUST NOT delete them — they remain available for promotion

#### Scenario: Promoting temporary to core

- **WHEN** a meeting with a temporary impress contact concludes
- **THEN** the system MUST prompt the user: "Want to add [name] to your impress list permanently?"
- **AND** if the user accepts, the contact MUST be promoted to core with source "promoted-from-calendar"
- **AND** the system MUST trigger a full deep-dive research job (Perplexity + Tavily) for the promoted contact if they only had a light deep dive

#### Scenario: Unified impress list for briefing engine

- **WHEN** the briefing engine requests the impress list
- **THEN** it MUST receive all active core contacts AND all currently-active temporary contacts
- **AND** MUST distinguish between core and temporary so the engine can weight them appropriately
- **AND** MUST include deep-dive data for contacts where research is complete

#### Scenario: Impress contact data model

- **WHEN** an impress contact record is stored or returned
- **THEN** it MUST include a `researchStatus` field (one of: `"none"`, `"pending"`, `"completed"`, `"failed"`)
- **AND** MUST include a nullable `deepDiveData` field containing structured research output when available
- **AND** MUST include a `lastEnrichedAt` timestamp indicating when the contact was last enriched (null if never enriched)
- **AND** MUST include an `enrichmentVersion` integer indicating how many times the contact has been enriched (0 if never)
- **AND** MUST include an `enrichmentDepth` field (one of: `"full"`, `"light"`, `"none"`) indicating whether the contact received a full deep dive, a Perplexity-only light deep dive, or no deep dive

### Requirement: Content Universe Storage

The user profile MUST store the derived content universe as a structured field.

#### Scenario: Content universe field on profile

- **WHEN** a content universe is generated for a user
- **THEN** the system MUST store it in a `contentUniverse` jsonb field on the user profile record
- **AND** the field MUST contain the full ContentUniverse structure: definition, coreTopics, exclusions, seismicThreshold, generatedAt, generatedFrom, and version

#### Scenario: Content universe is nullable

- **WHEN** a user profile exists but content universe has not yet been generated
- **THEN** the `contentUniverse` field MUST be null
- **AND** all downstream consumers (scoring agent, query derivation, etc.) MUST gracefully handle a null content universe by falling back to current behavior

### Requirement: Enrichment Lifecycle Configuration

The user profile MUST support configuration of contact enrichment lifecycle parameters.

#### Scenario: Default re-enrichment interval

- **WHEN** a new user profile is created
- **THEN** the profile MUST include a `reEnrichmentIntervalDays` configuration with a default value of 90

#### Scenario: User updates re-enrichment interval

- **WHEN** a user changes their `reEnrichmentIntervalDays` value
- **THEN** the profile MUST store the new interval
- **AND** the next staleness check MUST use the updated interval for all contacts

#### Scenario: Re-enrichment interval minimum

- **WHEN** a user attempts to set `reEnrichmentIntervalDays` below 30
- **THEN** the system MUST reject the update
- **AND** MUST return an error indicating the minimum allowed interval is 30 days
