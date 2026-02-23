## ADDED Requirements

### Requirement: Profile-Derived Query Generation

The system MUST generate targeted research queries from each user's profile to drive AI-powered signal collection.

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

### Requirement: Synthesized Research via Perplexity

The system MUST use Perplexity Sonar API for high-level synthesized research queries.

#### Scenario: Perplexity query execution

- **WHEN** a synthesized research query is generated
- **THEN** the system MUST call the Perplexity Sonar API with the query
- **AND** MUST store the response as a signal with: the synthesized answer as content, citations as metadata, layer "ai-research", and source "perplexity"

#### Scenario: Citations preserved

- **WHEN** Perplexity returns a response with citations
- **THEN** the system MUST store each citation URL in the signal metadata
- **AND** the briefing composer MUST be able to reference original sources

### Requirement: Targeted Discovery via Tavily

The system MUST use Tavily API for targeted signal discovery where specific, precise results are needed.

#### Scenario: Tavily search execution

- **WHEN** a targeted discovery query is generated (e.g., "new companies competing with [peer org]", "recent announcements from [impress list company]")
- **THEN** the system MUST call the Tavily API with the query
- **AND** MUST store each result as a separate signal with layer "ai-research" and source "tavily"

#### Scenario: Tavily results enriched with context

- **WHEN** Tavily returns search results
- **THEN** the system MUST store the extracted content, URL, and relevance score from Tavily
- **AND** MUST generate a summary of each result for the signal store

### Requirement: Deep-Dive Research on Demand

The system MUST support immediate research queries triggered by user deep-dive requests on briefing items.

#### Scenario: Deep-dive triggers targeted research

- **WHEN** a user requests a deep-dive on a briefing item
- **THEN** the system MUST generate a targeted Perplexity query based on the briefing item's topic and the user's profile context
- **AND** MUST return the synthesized research as the deep-dive response
- **AND** MUST store the research result in the signal store for future reference
