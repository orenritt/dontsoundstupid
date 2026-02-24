# ai-research Specification

## Purpose
TBD - created by archiving change ai-research-layer. Update Purpose after archive.
## Requirements
### Requirement: Profile-Derived Query Generation

The system MUST generate targeted research queries from each user's profile to drive AI-powered signal collection.

#### Scenario: Queries derived from profile elements

- **WHEN** the ai-research layer runs for a user
- **THEN** the system MUST generate Perplexity queries from: topics (each topic → "What should a [role] at [company] know about [topic] today?"), initiatives (each initiative → "Latest developments in [initiative]"), knowledge gaps (each gap → "Key things to understand about [gap] right now")
- **AND** MUST generate Tavily queries from: impress list companies (each company → "[company] news announcements"), peer organizations (each org → "[org] recent news")
- **AND** MUST deduplicate queries with identical text before executing

#### Scenario: Empty profile elements handled

- **WHEN** a profile element array is empty (e.g., no impress list companies, no knowledge gaps)
- **THEN** the system MUST skip query generation for that element type without error
- **AND** MUST still generate queries from other non-empty profile elements

### Requirement: Synthesized Research via Perplexity

The system MUST use Perplexity Sonar API for high-level synthesized research queries.

#### Scenario: Perplexity query execution

- **WHEN** a synthesized research query is generated from the user's topics, initiatives, concerns, or knowledge gaps
- **THEN** the system MUST call the Perplexity Sonar API (`POST https://api.perplexity.ai/chat/completions` with model `sonar`) with a context-framed query
- **AND** MUST store the response as a signal with: the synthesized answer as content, first citation URL as sourceUrl, source "perplexity" as sourceLabel, layer "ai-research"
- **AND** MUST cap Perplexity queries at 5 per pipeline run to control costs

#### Scenario: Citations preserved

- **WHEN** Perplexity returns a response with citations
- **THEN** the system MUST extract citation URLs from the response
- **AND** MUST use the first citation URL as the signal's sourceUrl
- **AND** MUST store all citation URLs in the signal metadata for downstream reference

#### Scenario: Perplexity unavailable

- **WHEN** the `PERPLEXITY_API_KEY` environment variable is not set or a Perplexity API call fails
- **THEN** the system MUST skip Perplexity queries without aborting the pipeline
- **AND** MUST log a warning indicating Perplexity research was skipped

### Requirement: Targeted Discovery via Tavily

The system MUST use Tavily API for targeted signal discovery where specific, precise results are needed.

#### Scenario: Tavily search execution

- **WHEN** a targeted discovery query is generated from the user's impress list companies or peer organizations
- **THEN** the system MUST call the Tavily API (`POST https://api.tavily.com/search`) with `topic: "news"`, `time_range: "week"`, and `max_results: 5`
- **AND** MUST store each result as a separate signal with title, extracted content as summary, result URL as sourceUrl, domain as sourceLabel, layer "ai-research"
- **AND** MUST cap Tavily queries at 10 per pipeline run to control costs

#### Scenario: Tavily results enriched with context

- **WHEN** Tavily returns search results
- **THEN** the system MUST store the extracted content, URL, and relevance score from Tavily
- **AND** MUST use Tavily's extracted content as the signal summary (not generate a separate LLM summary)

#### Scenario: Tavily unavailable

- **WHEN** the `TAVILY_API_KEY` environment variable is not set or a Tavily API call fails
- **THEN** the system MUST skip Tavily queries without aborting the pipeline
- **AND** MUST log a warning indicating Tavily discovery was skipped

### Requirement: Deep-Dive Research on Demand

The system MUST support immediate research queries triggered by user deep-dive requests on briefing items.

#### Scenario: Deep-dive triggers targeted research

- **WHEN** a user requests a deep-dive on a briefing item
- **THEN** the system MUST generate a targeted Perplexity query based on the briefing item's topic and the user's profile context
- **AND** MUST return the synthesized research as the deep-dive response
- **AND** MUST store the research result in the signal store for future reference

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
