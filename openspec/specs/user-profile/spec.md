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
- **AND** store them as the user's "impress list" — the people whose topics and interests shape briefing relevance

#### Scenario: Company enrichment from company name

- **WHEN** person enrichment returns a company name/domain
- **THEN** the system MUST call the company enrichment API (Clearbit/Crunchbase) and extract: company size, industry, funding stage, tech stack, job postings, known peer organizations

### Requirement: Context Layer

The system MUST maintain a dynamic context layer sourced from user conversation. This layer evolves as the user's work changes.

#### Scenario: Context fields populated from onboarding

- **WHEN** the onboarding conversation completes
- **THEN** the profile MUST contain: current initiatives/projects, key concerns, important terms/topics, geographic relevance, knowledge gaps, and intelligence goals

#### Scenario: Context is updatable

- **WHEN** a user updates their initiatives, concerns, focus areas, or intelligence goals
- **THEN** the context layer MUST reflect the changes without affecting the identity layer

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
- **AND** the profile MUST include: the user's identity, their impress list, confirmed peer organizations (with comments), derived relevance keywords for signal matching, and calendar connection status with upcoming meeting data when available

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

