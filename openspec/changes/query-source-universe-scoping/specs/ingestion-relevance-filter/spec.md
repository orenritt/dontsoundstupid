## ADDED Requirements

### Requirement: Post-Fetch Relevance Filter

The system MUST apply a programmatic relevance filter to fetched news articles before inserting them into the signal store. This filter acts as a coarse pre-filter independent of the LLM-based scoring agent gate.

#### Scenario: Filter applied when content universe exists

- **WHEN** a news article is fetched from the API and the user has a content universe
- **THEN** the system MUST concatenate the article's title and summary into a single lowercase string
- **AND** MUST check whether any `coreTopics` entry from the content universe appears as a case-insensitive substring
- **AND** MUST check whether any `exclusions` entry appears as a case-insensitive substring
- **AND** MUST pass the article only if at least one coreTopic matches
- **AND** MUST reject the article if exclusions match but no coreTopics match

#### Scenario: Filter skipped when no content universe

- **WHEN** a news article is fetched and the user does not have a content universe
- **THEN** the system MUST pass all articles without filtering (preserve current behavior)

#### Scenario: Exclusion does not override coreTopic match

- **WHEN** a news article matches both a coreTopic and an exclusion
- **THEN** the system MUST pass the article (coreTopic match takes precedence)

#### Scenario: Filter metrics tracked

- **WHEN** the post-fetch filter runs during an ingestion cycle
- **THEN** the system MUST track and log the number of articles passed and rejected by the filter
- **AND** MUST include these counts in the ingestion result
