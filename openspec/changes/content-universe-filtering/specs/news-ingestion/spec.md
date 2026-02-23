## MODIFIED Requirements

### Requirement: News Query Derivation

The system MUST automatically derive GDELT queries from user profile elements, scoped to the user's content universe.

#### Scenario: Queries from impress list companies

- **WHEN** a user profile contains impress list contacts with associated companies
- **THEN** the system MUST create news queries using each company name as a keyword
- **AND** MUST set the `derivedFrom` field to "impress-list" with the company name as profile reference

#### Scenario: Queries from peer organizations

- **WHEN** a user profile contains confirmed peer organizations
- **THEN** the system MUST create news queries using each peer organization name as a keyword
- **AND** MUST set the `derivedFrom` field to "peer-org" with the organization name as profile reference

#### Scenario: Queries from intelligence goals

- **WHEN** a user profile contains active intelligence goals with detail text
- **THEN** the system MUST create news queries using the goal detail as keyword phrases
- **AND** MUST set the `derivedFrom` field to "intelligence-goal" with the goal category and detail as profile reference

#### Scenario: Queries from industry topics scoped to content universe

- **WHEN** a user profile contains a content universe with coreTopics
- **THEN** the system MUST create news queries using each coreTopics entry as a quoted phrase query, NOT using bare parsedTopics keywords
- **AND** each query MUST use the intersectional descriptor from coreTopics (e.g., "parametric insurance ecosystem restoration") rather than independent keywords (e.g., NOT "insurtech")
- **AND** MUST set the `derivedFrom` field to "industry" with the coreTopics entry as profile reference

#### Scenario: Queries from industry topics without content universe

- **WHEN** a user profile does NOT have a content universe (legacy user, generation pending)
- **THEN** the system MUST fall back to creating news queries using parsedTopics keywords as before
- **AND** MUST set the `derivedFrom` field to "industry" with the topic as profile reference

#### Scenario: Geographic filtering

- **WHEN** a user profile contains geographic relevance entries
- **THEN** the system MUST apply GDELT sourcecountry filters to restrict results to relevant geographies
- **AND** MUST apply geographic filters across all queries for that user

#### Scenario: Query deduplication

- **WHEN** generating news queries across multiple users
- **THEN** the system MUST deduplicate queries using content hash comparison
- **AND** MUST maintain a single query record shared across users with the same query intent
- **AND** MUST track all users associated with each query for provenance tagging

#### Scenario: Query refresh on profile update

- **WHEN** a user profile is updated (impress list, peers, intelligence goals, topics, or geographic relevance changes)
- **THEN** the system MUST regenerate the user's derived news queries
- **AND** MUST deactivate queries that no longer match any profile element
- **AND** MUST NOT delete deactivated queries to preserve historical poll state

## ADDED Requirements

### Requirement: Universe-Scoped Query Refresh

The news query refresh process MUST generate new queries that go deeper within the user's content universe, NOT broader into adjacent fields.

#### Scenario: Refresh prompt constrained to content universe

- **WHEN** the query refresh LLM generates new search queries for a user with a content universe
- **THEN** the LLM prompt MUST include the user's content universe definition and exclusion list
- **AND** the prompt MUST instruct the LLM to generate queries that explore deeper, more specific angles WITHIN the content universe (e.g., specific sub-niches, specific mechanisms, specific regulatory bodies within the user's domain)
- **AND** the prompt MUST explicitly prohibit generating queries about topics in the exclusion list
- **AND** the prompt MUST NOT use language like "adjacent topics", "emerging areas they haven't mentioned", "cross-cutting trends", or "white space"

#### Scenario: Refresh without content universe

- **WHEN** the query refresh LLM generates new search queries for a user without a content universe
- **THEN** the system MUST fall back to current behavior
