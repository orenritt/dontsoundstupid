## ADDED Requirements

### Requirement: Deep-Dive Research Trigger

The system MUST automatically run a deep-dive research job on each impress contact when they are added.

#### Scenario: Deep dive triggered on add from settings

- **WHEN** a user adds an impress contact via the settings API
- **THEN** the system MUST return the contact immediately with `researchStatus: "pending"`
- **AND** MUST trigger an asynchronous deep-dive research job for that contact
- **AND** the response MUST NOT block on research completion

#### Scenario: Deep dive triggered on add from onboarding

- **WHEN** a user adds impress contacts during onboarding
- **THEN** the system MUST trigger an asynchronous deep-dive research job for each contact
- **AND** onboarding completion MUST NOT block on research completion

#### Scenario: Deep dive triggered retroactively

- **WHEN** a user triggers a deep dive on an existing contact that has `researchStatus: "none"`
- **THEN** the system MUST run the deep-dive research job for that contact
- **AND** MUST update the `researchStatus` to `"pending"` immediately

### Requirement: Deep-Dive Research Pipeline

The system MUST research an impress contact using Perplexity for synthesized overview and Tavily for targeted discovery, then structure the output via LLM.

#### Scenario: Perplexity synthesized research

- **WHEN** a deep-dive research job runs for a contact
- **THEN** the system MUST query Perplexity with a prompt asking about the person's professional focus areas, recent publications, public talks, and topics they care about
- **AND** MUST include the contact's name, title, and company in the query

#### Scenario: Tavily targeted search

- **WHEN** a deep-dive research job runs for a contact
- **THEN** the system MUST query Tavily for recent news about the person and their company
- **AND** MUST run Perplexity and Tavily queries in parallel

#### Scenario: LLM structuring of research

- **WHEN** raw research results are collected from Perplexity and Tavily
- **THEN** the system MUST use an LLM to extract a structured output containing: `interests` (string[]), `focusAreas` (string[]), `recentActivity` (string[]), `talkingPoints` (string[]), `companyContext` (string), and `summary` (string)

#### Scenario: Graceful handling of thin results

- **WHEN** Perplexity or Tavily returns limited or no results for a contact
- **THEN** the system MUST NOT fail the research job
- **AND** MUST store whatever structured data could be extracted
- **AND** MUST set `researchStatus` to `"completed"` (not `"failed"`)

#### Scenario: API failure handling

- **WHEN** both Perplexity and Tavily calls fail
- **THEN** the system MUST set `researchStatus` to `"failed"`
- **AND** MUST log the error for debugging
- **AND** MUST NOT affect the impress contact's core data (name, title, company)

### Requirement: Deep-Dive Data Storage

The system MUST store structured deep-dive research output on the impress contact record.

#### Scenario: Research results stored on contact

- **WHEN** a deep-dive research job completes successfully
- **THEN** the system MUST update the contact's `deepDiveData` column with the structured JSON output
- **AND** MUST set `researchStatus` to `"completed"`

#### Scenario: Research status tracking

- **WHEN** querying impress contacts
- **THEN** each contact MUST include a `researchStatus` field with one of: `"none"`, `"pending"`, `"completed"`, `"failed"`

### Requirement: Knowledge Graph Seeding from Deep Dive

The system MUST seed the user's knowledge graph with entities derived from deep-dive research, linked to the impress contact's person entity.

#### Scenario: Interest and focus area entities created

- **WHEN** a deep-dive research job completes with structured data
- **THEN** the system MUST create `concept` entities for each interest and focus area with `source: "impress-deep-dive"` and `confidence: 0.7`
- **AND** MUST generate vector embeddings for each entity

#### Scenario: Entities linked to person via edges

- **WHEN** deep-dive-derived concept entities are created
- **THEN** the system MUST create `cares-about` edges from the impress contact's person entity to each concept entity

#### Scenario: Person entity enriched with summary

- **WHEN** a deep-dive research job completes
- **THEN** the system MUST update the impress contact's person entity in the knowledge graph with the deep-dive summary as its description

#### Scenario: Deduplication with existing entities

- **WHEN** a deep-dive-derived concept matches an existing entity in the user's knowledge graph
- **THEN** the system MUST link to the existing entity via an edge rather than creating a duplicate
- **AND** MUST NOT increase the existing entity's confidence (the deep-dive confidence of 0.7 is about someone else's knowledge, not the user's)
