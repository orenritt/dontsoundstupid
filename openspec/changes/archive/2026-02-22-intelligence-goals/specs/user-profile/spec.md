## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Context Layer

The system MUST maintain a dynamic context layer sourced from user conversation. This layer evolves as the user's work changes.

#### Scenario: Context fields populated from onboarding

- **WHEN** the onboarding conversation completes
- **THEN** the profile MUST contain: current initiatives/projects, key concerns, important terms/topics, geographic relevance, knowledge gaps, and intelligence goals

#### Scenario: Context is updatable

- **WHEN** a user updates their initiatives, concerns, focus areas, or intelligence goals
- **THEN** the context layer MUST reflect the changes without affecting the identity layer
