## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Dynamic Impress List

The impress list MUST support multiple tiers and be modifiable at any time after onboarding.

#### Scenario: Core contacts from onboarding

- **WHEN** a user adds people during onboarding
- **THEN** each person MUST be stored as a core impress contact with source "onboarding"
- **AND** core contacts MUST persist until explicitly removed by the user

#### Scenario: User adds new impress contact post-onboarding

- **WHEN** a user provides a new LinkedIn URL to add to their impress list
- **THEN** the system MUST enrich the person's profile
- **AND** MUST add them as a core impress contact with source "user-added"

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

#### Scenario: Unified impress list for briefing engine

- **WHEN** the briefing engine requests the impress list
- **THEN** it MUST receive all active core contacts AND all currently-active temporary contacts
- **AND** MUST distinguish between core and temporary so the engine can weight them appropriately
