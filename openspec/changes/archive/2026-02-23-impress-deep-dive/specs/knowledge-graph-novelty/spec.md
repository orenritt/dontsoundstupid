## MODIFIED Requirements

### Requirement: T-0 Knowledge Seeding

The system MUST pre-populate a user's knowledge graph at onboarding completion using profile-derived and AI-scanned entities. The system MUST also seed entities from impress contact deep-dive research as it completes.

#### Scenario: Profile-derived seeding

- **WHEN** a user completes onboarding
- **THEN** the system MUST extract entities from: their company and products, all peer organizations, all impress list contacts, all topics and initiative keywords, and role-specific baseline concepts
- **AND** MUST set confidence to 1.0 for profile-derived entities

#### Scenario: AI-powered industry scan seeding

- **WHEN** profile-derived seeding completes
- **THEN** the system MUST use AI research APIs to generate a comprehensive list of entities a competent person in the user's exact role/industry would be expected to know
- **AND** MUST add these entities with confidence 0.8
- **AND** MUST generate vector embeddings for all seeded entities

#### Scenario: Deep-dive-derived seeding

- **WHEN** an impress contact deep-dive research job completes with structured data
- **THEN** the system MUST create `concept` entities for each interest and focus area with `source: "impress-deep-dive"` and `confidence: 0.7`
- **AND** MUST generate vector embeddings for each entity
- **AND** MUST create `cares-about` edges from the contact's person entity to each concept entity
- **AND** MUST update the person entity's description with the deep-dive summary
- **AND** MUST deduplicate against existing entities by semantic match, linking via edges rather than creating duplicates
