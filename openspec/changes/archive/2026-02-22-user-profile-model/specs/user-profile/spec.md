## ADDED Requirements

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
- **THEN** the profile MUST contain: current initiatives/projects, key concerns, important terms/topics, geographic relevance, knowledge gaps

#### Scenario: Context is updatable

- **WHEN** a user updates their initiatives, concerns, or focus areas
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
- **AND** the profile MUST include: the user's identity, their impress list, confirmed peer organizations (with comments), and derived relevance keywords for signal matching
