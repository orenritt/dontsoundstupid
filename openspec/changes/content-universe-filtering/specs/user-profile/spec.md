## MODIFIED Requirements

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

### Requirement: Unified Profile

The system MUST provide a unified profile that combines all layers for the briefing engine.

#### Scenario: Profile serves the briefing engine

- **WHEN** the briefing engine requests a user profile
- **THEN** it MUST receive a unified object combining identity and context layers
- **AND** the profile MUST include: the user's identity, their impress list, confirmed peer organizations (with comments), derived relevance keywords for signal matching, calendar connection status with upcoming meeting data when available, and the user's content universe (definition, coreTopics, exclusions, seismicThreshold)

## ADDED Requirements

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
