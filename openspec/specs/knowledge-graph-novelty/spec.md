## Purpose

The knowledge graph and novelty filtering system ensures briefings only contain information the user doesn't already know. It maintains a per-user graph of known entities (companies, people, concepts, terms), pre-populated aggressively at onboarding via profile extraction and AI-powered industry scanning, and continuously updated as briefings are delivered and feedback is received. Novelty acts as a multiplicative gate on relevance — high relevance with zero novelty scores zero. On days with nothing novel, the system sends a minimal message with interest graph refinement prompts.

## Requirements

### Requirement: Knowledge Entity Management

The system MUST maintain a per-user knowledge graph of entities (companies, people, concepts, terms, products, events, facts) the user is presumed to know.

#### Scenario: Entity creation

- **WHEN** a knowledge entity is added to a user's graph
- **THEN** the system MUST store the entity type, canonical name, description, source (how it entered), confidence score (0-1), and vector embedding
- **AND** MUST track when the entity was first known and last reinforced

#### Scenario: Entity relationships

- **WHEN** knowledge entities are related
- **THEN** the system MUST store directed edges with relationship types (works-at, competes-with, uses, researches, part-of, related-to)

#### Scenario: Entity deduplication

- **WHEN** a new entity is added that semantically matches an existing entity in the user's graph
- **THEN** the system MUST merge with the existing entity and update confidence/reinforcement timestamps rather than creating a duplicate

### Requirement: T-0 Knowledge Seeding

The system MUST pre-populate a user's knowledge graph at onboarding completion using profile-derived and AI-scanned entities.

#### Scenario: Profile-derived seeding

- **WHEN** a user completes onboarding
- **THEN** the system MUST extract entities from: their company and products, all peer organizations, all impress list contacts, all topics and initiative keywords, and role-specific baseline concepts
- **AND** MUST set confidence to 1.0 for profile-derived entities

#### Scenario: AI-powered industry scan seeding

- **WHEN** profile-derived seeding completes
- **THEN** the system MUST use AI research APIs to generate a comprehensive list of entities a competent person in the user's exact role/industry would be expected to know
- **AND** MUST add these entities with confidence 0.8
- **AND** MUST generate vector embeddings for all seeded entities

### Requirement: Novelty Scoring

The system MUST compute a novelty score (0-1) for each signal relative to each user's knowledge graph.

#### Scenario: Entity overlap check

- **WHEN** scoring a signal for novelty
- **THEN** the system MUST compare the signal's embedding against all user knowledge entity embeddings
- **AND** MUST reduce novelty score proportionally to semantic overlap with known entities

#### Scenario: Exposure history check

- **WHEN** scoring a signal for novelty
- **THEN** the system MUST check if the user has been served signals about the same topic cluster before
- **AND** MUST only score as novel if the signal contains a meaningful delta (new development, contradiction, escalation)

#### Scenario: Term novelty bonus

- **WHEN** a signal contains a term from active term bursts that does not appear in the user's knowledge graph
- **THEN** the system MUST boost the novelty score for that signal

#### Scenario: Multiplicative gating

- **WHEN** computing the final briefing inclusion score
- **THEN** the system MUST multiply relevance score by novelty score
- **AND** a signal with zero novelty MUST score zero regardless of relevance

### Requirement: Knowledge Graph Maintenance

The system MUST continuously update the knowledge graph based on briefing delivery and user feedback.

#### Scenario: Post-delivery entity extraction

- **WHEN** a briefing is delivered to a user
- **THEN** the system MUST extract entities from all delivered signals and add them to the user's knowledge graph with source "briefing-delivered" and confidence 0.9

#### Scenario: Deep-dive reinforcement

- **WHEN** a user requests a deep-dive on a briefing item
- **THEN** the system MUST add entities from the deep-dive response with source "deep-dive" and confidence 1.0

#### Scenario: "Less of this" feedback

- **WHEN** a user provides "less of this" or "not novel" feedback
- **THEN** the system MUST add entities from the dismissed signal with confidence 1.0 (they already know this)

#### Scenario: "More of this" feedback

- **WHEN** a user provides "more of this" feedback
- **THEN** the system MUST reduce confidence of related entities in the knowledge graph (indicating partial knowledge the user wants to deepen)

### Requirement: Exposure Tracking

The system MUST track every signal delivered to each user for novelty assessment.

#### Scenario: Signal delivery recording

- **WHEN** a briefing containing signals is delivered
- **THEN** the system MUST create an exposure record linking the user, signal, briefing, mapped knowledge entities, and delivery timestamp

#### Scenario: Engagement tracking

- **WHEN** a user engages with a delivered signal (click, deep-dive, feedback)
- **THEN** the system MUST update the exposure record to reflect engagement

### Requirement: Zero-Briefing Day Handling

The system MUST handle days when novelty filtering leaves no signals above threshold.

#### Scenario: No novel signals

- **WHEN** all relevant signals are filtered out by novelty scoring
- **THEN** the system MUST send a minimal message acknowledging nothing new was found
- **AND** MUST include a refinement prompt suggesting interest graph expansions
- **AND** MUST report how many signals were relevant but not novel (transparency)

#### Scenario: Interest graph refinement

- **WHEN** generating a refinement prompt
- **THEN** the system MUST use the LLM to analyze what was filtered out and suggest adjacent topic areas the user might want to track
- **AND** MUST allow the user to accept/reject suggested expansions which update their profile
