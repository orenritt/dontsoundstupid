## ADDED Requirements

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

## MODIFIED Requirements

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
