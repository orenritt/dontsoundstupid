## ADDED Requirements

### Requirement: Expertise Self-Assessment

The system MUST allow users to rate their expertise level in each intelligence goal category.

#### Scenario: Onboarding self-assessment

- **WHEN** a user has selected their intelligence goals during onboarding
- **THEN** the system MUST present each selected goal category and ask the user to rate their current expertise: novice, developing, proficient, or expert
- **AND** MUST explain that this calibrates briefing depth ("expert = only tell me what's genuinely new; novice = teach me the basics")

#### Scenario: Post-onboarding modification

- **WHEN** a user wants to update their expertise levels after onboarding
- **THEN** the system MUST allow them to modify expertise levels via profile settings
- **AND** MUST recalculate scoring overrides when expertise levels change

### Requirement: Scoring Impact

The system MUST adjust relevance scoring and novelty thresholds based on expertise self-assessment.

#### Scenario: Novice category scoring

- **WHEN** a user rates themselves as "novice" in a category
- **THEN** the system MUST boost the relevance weight for signals in that category
- **AND** MUST lower the novelty threshold (more signals pass through, even if somewhat known)
- **AND** MUST seed fewer entities in the knowledge graph for that category during T-0

#### Scenario: Expert category scoring

- **WHEN** a user rates themselves as "expert" in a category
- **THEN** the system MUST maintain standard relevance weight for signals in that category
- **AND** MUST raise the novelty threshold significantly (only genuinely new developments pass)
- **AND** MUST aggressively pre-populate the knowledge graph for that category during T-0

#### Scenario: Scoring override derivation

- **WHEN** computing per-category scoring overrides from self-assessment
- **THEN** the system MUST map expertise levels to specific multipliers: novice = relevance 1.5x / novelty threshold 0.3, developing = 1.2x / 0.5, proficient = 1.0x / 0.7, expert = 1.0x / 0.9
