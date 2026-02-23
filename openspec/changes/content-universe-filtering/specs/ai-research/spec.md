## MODIFIED Requirements

### Requirement: Profile-Derived Query Generation

The system MUST generate targeted research queries from each user's profile, scoped to their content universe, to drive AI-powered signal collection.

#### Scenario: Queries derived from intelligence goals

- **WHEN** a daily research run is triggered
- **THEN** the system MUST generate research queries from each user's intelligence goals (e.g., intelligence goal "regulatory" with detail "FDA approval changes" → query: "What FDA approval process changes happened in the last 24 hours?")
- **AND** MUST generate queries from the user's industry, role, and active initiatives

#### Scenario: Queries derived from impress list and peer orgs

- **WHEN** a daily research run is triggered
- **THEN** the system MUST generate queries about the user's impress list people (what are they talking about, what's happening at their companies) and peer organizations (announcements, funding, product launches)

#### Scenario: Queries are deduplicated across users

- **WHEN** multiple users have overlapping profile elements
- **THEN** the system MUST deduplicate identical or near-identical queries to avoid redundant API calls
- **AND** MUST tag the resulting signals with provenance for all relevant users

#### Scenario: Template queries scoped to content universe

- **WHEN** template research queries are generated for a user with a content universe
- **THEN** each Perplexity query MUST include the content universe definition as scoping context (e.g., "What recent developments in [coreTopics entry] should a [role] at [company] know about? Do NOT include [exclusions].")
- **AND** each query MUST reference a specific coreTopics entry rather than a bare parsedTopics keyword
- **AND** the query MUST NOT use generic framing like "What should a VP know about insurtech?" — it MUST use the intersectional descriptor from coreTopics

#### Scenario: LLM-derived queries constrained by content universe

- **WHEN** the LLM generates research queries for a user with a content universe
- **THEN** the LLM prompt MUST include the content universe definition, coreTopics, and exclusion list
- **AND** the prompt MUST instruct the LLM to generate queries that go deeper within the user's niche — more specific sub-topics, specific mechanisms, specific players, specific regulatory developments
- **AND** the prompt MUST NOT use language like "white space", "adjacent developments", "cross-cutting trends", or "things they might miss outside their domain"
- **AND** the prompt MUST explicitly list the exclusions and instruct the LLM to avoid generating queries about excluded topics

#### Scenario: Queries without content universe

- **WHEN** a daily research run is triggered for a user without a content universe
- **THEN** the system MUST fall back to current query generation behavior (template + LLM queries using parsedTopics)

## ADDED Requirements

### Requirement: Knowledge Gap Scan Scoped to Content Universe

The knowledge gap scan MUST constrain gap discovery to topics within the user's content universe.

#### Scenario: Gap scan prompt includes content universe

- **WHEN** a knowledge gap scan is triggered for a user with a content universe
- **THEN** the LLM prompt MUST include the content universe definition and exclusion list
- **AND** the prompt MUST instruct the LLM to find gaps WITHIN the user's content universe — emerging concepts, companies, regulations, and technologies specifically within their niche
- **AND** the prompt MUST NOT use language like "cross-industry trends", "adjacent domains", or "broader developments affecting their field"
- **AND** any gap items that match content universe exclusions MUST be filtered out before creating news queries from them

#### Scenario: Gap scan without content universe

- **WHEN** a knowledge gap scan is triggered for a user without a content universe
- **THEN** the system MUST fall back to current gap scan behavior
