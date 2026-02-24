## MODIFIED Requirements

### Requirement: News Query Derivation

The system MUST automatically derive news queries from user profile elements, scoped to the user's content universe when one exists.

#### Scenario: Queries from impress list companies

- **WHEN** a user profile contains impress list contacts with associated companies AND the user has a content universe
- **THEN** the system MUST create news queries combining the company name with the top 3 coreTopics as an OR group (e.g., `"CompanyName" AND ("topic1" OR "topic2" OR "topic3")`)
- **AND** MUST set the `derivedFrom` field to "impress-list" with the company name as profile reference

#### Scenario: Queries from impress list companies without content universe

- **WHEN** a user profile contains impress list contacts with associated companies AND the user does not have a content universe
- **THEN** the system MUST create news queries using each company name as a keyword (current behavior)
- **AND** MUST set the `derivedFrom` field to "impress-list" with the company name as profile reference

#### Scenario: Queries from peer organizations

- **WHEN** a user profile contains confirmed peer organizations AND the user has a content universe
- **THEN** the system MUST create news queries combining the peer organization name with the top 3 coreTopics as an OR group
- **AND** MUST set the `derivedFrom` field to "peer-org" with the organization name as profile reference

#### Scenario: Queries from peer organizations without content universe

- **WHEN** a user profile contains confirmed peer organizations AND the user does not have a content universe
- **THEN** the system MUST create news queries using each peer organization name as a keyword (current behavior)
- **AND** MUST set the `derivedFrom` field to "peer-org" with the organization name as profile reference

#### Scenario: Queries from intelligence goals

- **WHEN** a user profile contains active intelligence goals with detail text AND the user has a content universe
- **THEN** the system MUST create news queries that combine the goal detail with the content universe definition context
- **AND** MUST set the `derivedFrom` field to "intelligence-goal" with the goal category and detail as profile reference

#### Scenario: Queries from intelligence goals without content universe

- **WHEN** a user profile contains active intelligence goals with detail text AND the user does not have a content universe
- **THEN** the system MUST create news queries using the goal detail as keyword phrases (current behavior)
- **AND** MUST set the `derivedFrom` field to "intelligence-goal" with the goal category and detail as profile reference

#### Scenario: Queries from industry topics

- **WHEN** a user profile contains industry topics
- **THEN** the system MUST create news queries using content universe coreTopics as quoted phrase queries when a content universe exists, or topic keywords when it does not (no change from current behavior)
- **AND** MUST set the `derivedFrom` field to "industry" with the topic as profile reference

#### Scenario: Content universe loaded once per derivation

- **WHEN** deriving news queries for a user
- **THEN** the system MUST load the user's content universe once and pass it to all derivation functions
- **AND** MUST NOT load the content universe separately in each derivation function

#### Scenario: Geographic filtering

- **WHEN** a user profile contains geographic relevance entries
- **THEN** the system MUST apply geographic filters to restrict results to relevant geographies
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
