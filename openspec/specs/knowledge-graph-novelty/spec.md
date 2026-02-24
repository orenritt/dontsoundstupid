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

#### Scenario: Suppression check on entity creation

- **WHEN** a new entity is about to be inserted into a user's knowledge graph
- **THEN** the system MUST check the `pruned_entities` suppression list for a matching `(user_id, name, entity_type)`
- **AND** MUST silently skip insertion if the entity is suppressed

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

The system MUST handle days when no signals meet the quality bar, distinguishing between "nothing novel" and "nothing interesting enough."

#### Scenario: No novel signals

- **WHEN** all relevant signals are filtered out by novelty scoring (signals exist but the user already knows about them)
- **THEN** the system MUST send a minimal message acknowledging nothing new was found
- **AND** MUST include a refinement prompt suggesting interest graph expansions
- **AND** MUST report how many signals were relevant but not novel (transparency)

#### Scenario: No interesting signals

- **WHEN** the scoring agent returns zero selections because no candidates cleared the interestingness threshold (signals exist and may be novel, but none are worth the user's time)
- **THEN** the system MUST NOT send any message — silence is the correct response
- **AND** MUST record the pipeline status as `"skipped-nothing-interesting"` with the candidate count and scoring reasoning
- **AND** MUST NOT trigger interest graph refinement prompts (the user's interests are fine — the signal pool just had a quiet day)

#### Scenario: Distinguishing skip reasons in pipeline tracking

- **WHEN** a zero-briefing day occurs
- **THEN** the system MUST record a distinct status that differentiates between:
  1. `"skipped-no-signals"` — no candidate signals existed at all (ingestion issue)
  2. `"skipped-nothing-novel"` — signals existed but none were novel to the user
  3. `"skipped-nothing-interesting"` — signals existed and may be novel, but none cleared the interestingness bar
- **AND** each status MUST include metadata appropriate to its cause (e.g., candidate count, novelty scores, scoring reasoning)

#### Scenario: Interest graph refinement

- **WHEN** generating a refinement prompt (only for the "nothing novel" case)
- **THEN** the system MUST use the LLM to analyze what was filtered out and suggest adjacent topic areas the user might want to track
- **AND** MUST allow the user to accept/reject suggested expansions which update their profile

### Requirement: Entity Pruning via Litmus Test

The system MUST support batch pruning of knowledge graph entities using a cheap LLM (gpt-4o-mini) that evaluates each entity against two criteria: (1) not too general — would a random professional in any industry also know this? and (2) plausibly related — could this entity surface in a signal that would genuinely matter to this specific user? Entities failing either criterion MUST be removed from the knowledge graph and added to the suppression list.

#### Scenario: Batch pruning evaluation

- **WHEN** pruning is triggered for a user
- **THEN** the system MUST load all non-exempt entities from the user's knowledge graph
- **AND** MUST send them to gpt-4o-mini in batches of up to 50, along with the user's role, company, and topics
- **AND** the model MUST return a JSON verdict for each entity: keep or prune with a one-sentence reason

#### Scenario: Entity removal on prune verdict

- **WHEN** the litmus test returns a prune verdict for an entity
- **THEN** the system MUST delete the entity from `knowledge_entities`
- **AND** MUST delete any `knowledge_edges` referencing the entity
- **AND** MUST add the entity's name and type to the user's suppression list

#### Scenario: Source exemptions

- **WHEN** evaluating entities for pruning
- **THEN** the system MUST exempt entities with source `profile-derived` or `rapid-fire`
- **AND** MUST only evaluate entities from sources: `industry-scan`, `briefing-delivered`, `deep-dive`, `feedback-implicit`, `impress-deep-dive`, `calendar-deep-dive`

#### Scenario: Ambiguous verdict

- **WHEN** the model is uncertain whether an entity should be pruned
- **THEN** the system MUST keep the entity (err toward keeping)

### Requirement: Entity Suppression List

The system MUST maintain a per-user suppression list of pruned entity names that prevents re-addition of previously pruned entities.

#### Scenario: Suppression record creation

- **WHEN** an entity is pruned
- **THEN** the system MUST store the user ID, entity name, entity type, pruning timestamp, and the model's reason in the `pruned_entities` table
- **AND** MUST enforce a unique constraint on `(user_id, name, entity_type)`

#### Scenario: Insertion guard on all entity paths

- **WHEN** any code path attempts to insert a knowledge entity (seeding, gap scan, deep-dive, briefing extraction, feedback)
- **THEN** the system MUST check the suppression list for a matching `(user_id, name, entity_type)`
- **AND** MUST silently skip insertion if a match exists

#### Scenario: Admin un-suppression

- **WHEN** an admin removes an entity from the suppression list
- **THEN** future insertion paths MUST be able to add that entity again
- **AND** the entity MUST NOT automatically reappear in the knowledge graph (requires re-seeding or manual add)

### Requirement: Pruning Triggers

The system MUST support multiple triggers for knowledge graph pruning.

#### Scenario: Post-seeding pruning

- **WHEN** `seedKnowledgeGraph()` completes for a user
- **THEN** the system MUST automatically trigger `pruneKnowledgeGraph()` for that user

#### Scenario: Periodic sweep

- **WHEN** the periodic maintenance schedule fires (weekly cadence)
- **THEN** the system MUST run pruning for all active users

#### Scenario: Admin on-demand pruning

- **WHEN** an admin triggers pruning via `POST /api/admin/prune-knowledge-graph` with a `userId`
- **THEN** the system MUST run pruning immediately for that user
- **AND** MUST return the count of entities pruned and entities kept
