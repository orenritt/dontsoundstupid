## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Context Layer

The system MUST maintain a dynamic context layer sourced from user conversation. This layer evolves as the user's work changes.

#### Scenario: Context fields populated from onboarding

- **WHEN** the onboarding conversation completes
- **THEN** the profile MUST contain: current initiatives/projects, key concerns, important terms/topics, geographic relevance, knowledge gaps, and intelligence goals

#### Scenario: Context is updatable

- **WHEN** a user updates their initiatives, concerns, focus areas, or intelligence goals
- **THEN** the context layer MUST reflect the changes without affecting the identity layer

#### Scenario: Context evolves from briefing feedback

- **WHEN** a user provides tuning feedback through briefing interactions
- **THEN** the context layer MUST incorporate learned relevance adjustments
- **AND** accumulated feedback MUST refine the derived relevance keywords used for signal matching
