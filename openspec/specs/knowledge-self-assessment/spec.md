## Purpose

Knowledge self-assessment calibrates how the system scores and filters signals per topic: areas the user knows deeply get dramatically higher novelty thresholds (only genuinely new developments pass), while areas the user wants to learn about get boosted relevance and lower novelty bars. This calibrates the "don't sound stupid" experience to each user's actual knowledge landscape.

Self-assessment data is collected via two mechanisms: (1) implicit signals extracted from the free-text/voice conversation during onboarding, and (2) explicit rapid-fire classification where the user confirms or corrects the system's inferences. There are no structured form widgets, segmented controls, or rating scales — expertise is captured conversationally and confirmed with simple tap/swipe interactions.

## Requirements

### Requirement: Expertise Calibration via Conversation + Rapid-Fire

The system MUST derive expertise levels from the combination of conversational input and rapid-fire classification, not from structured self-assessment forms.

#### Scenario: Implicit expertise extraction from conversation

- **WHEN** a user completes the free-text/voice conversation during onboarding
- **THEN** the system MUST use LLM parsing to identify topics the user appears to be expert in (confident language, detailed knowledge, specific terminology) and topics they appear weak in (uncertainty markers, explicit "I don't know" signals, questions)
- **AND** MUST generate a list of inferred topics with initial expertise signals for the rapid-fire round

#### Scenario: Explicit expertise confirmation via rapid-fire

- **WHEN** the rapid-fire clarification round is presented
- **THEN** for each inferred topic the user MUST choose one of: "Know tons" (maps to expert), "Need more" (maps to novice/developing), "Not relevant" (removes from tracking)
- **AND** the system MUST map these responses to `ExpertiseLevel` values for scoring override computation

#### Scenario: Post-onboarding modification

- **WHEN** a user wants to update their expertise calibration after onboarding
- **THEN** the system MUST allow them to update their context via free-text input in settings (re-run conversation parsing)
- **AND** MUST recalculate scoring overrides when expertise signals change

### Requirement: Scoring Impact

The system MUST adjust relevance scoring and novelty thresholds based on expertise calibration.

#### Scenario: Novice/need-more topic scoring

- **WHEN** a user classifies a topic as "Need more" during rapid-fire (or LLM parsing infers novice-level knowledge)
- **THEN** the system MUST boost the relevance weight for signals related to that topic
- **AND** MUST lower the novelty threshold (more signals pass through, even if somewhat known)
- **AND** MUST seed fewer entities in the knowledge graph for that topic during T-0

#### Scenario: Expert/know-tons topic scoring

- **WHEN** a user classifies a topic as "Know tons" during rapid-fire (or LLM parsing infers expert-level knowledge)
- **THEN** the system MUST maintain standard relevance weight for signals related to that topic
- **AND** MUST raise the novelty threshold significantly (only genuinely new developments pass)
- **AND** MUST aggressively pre-populate the knowledge graph for that topic during T-0

#### Scenario: Scoring override derivation

- **WHEN** computing per-topic scoring overrides from expertise calibration
- **THEN** the system MUST map expertise levels to specific multipliers: novice = relevance 1.5x / novelty threshold 0.3, developing = 1.2x / 0.5, proficient = 1.0x / 0.7, expert = 1.0x / 0.9
