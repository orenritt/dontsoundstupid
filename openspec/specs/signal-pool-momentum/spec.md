## Purpose

The signal pool momentum tool is a scoring agent capability that queries the shared signal store for frequency and acceleration data on topics and entities across recent time windows. It enables the agent to detect what is picking up steam in the ingested content before it trends publicly — complementing the external Google Trends tool with internal signal pool intelligence.

## Requirements

### Requirement: Signal Pool Momentum Query

The system MUST provide the scoring agent with a tool that queries the signal store for frequency and acceleration data on topics and entities across recent time windows, enabling detection of what is picking up steam in the user's ingested content.

#### Scenario: Momentum query with default window

- **WHEN** the scoring agent calls `check_signal_momentum` with a list of query terms and no explicit window size
- **THEN** the system MUST search signal titles, summaries, and content for case-insensitive substring matches against each query term
- **AND** MUST compute match counts across two consecutive 7-day windows: the current window (last 7 days) and the prior window (8-14 days ago)
- **AND** MUST return per-query results with counts for each window, acceleration classification, acceleration ratio, and the top 3 most recent matching signals

#### Scenario: Momentum query with custom window

- **WHEN** the scoring agent calls `check_signal_momentum` with a `windowDays` parameter
- **THEN** the system MUST use the specified window size (in days) for both the current and prior comparison windows
- **AND** MUST accept window sizes between 1 and 30 days

#### Scenario: Acceleration classification

- **WHEN** the system computes the acceleration ratio (current window count divided by prior window count) for a query term
- **THEN** the system MUST classify acceleration as:
  - `"surging"` when the ratio is 3.0 or greater
  - `"rising"` when the ratio is between 1.5 (inclusive) and 3.0 (exclusive)
  - `"stable"` when the ratio is between 0.67 (inclusive) and 1.5 (exclusive)
  - `"declining"` when the ratio is below 0.67
  - `"new"` when the prior window count is 0 and the current window count is greater than 0
- **AND** when both windows have zero matches, the system MUST classify acceleration as `"stable"` with a ratio of 0

#### Scenario: Matching signal context

- **WHEN** the system finds matching signals for a query term
- **THEN** the system MUST return the 3 most recently ingested matching signals, each with title, ingestion timestamp, and source layer
- **AND** MUST order them by ingestion time descending (most recent first)

#### Scenario: Query term limit

- **WHEN** the scoring agent provides more than 5 query terms
- **THEN** the system MUST process only the first 5 terms
- **AND** MUST indicate in the response that terms were capped

#### Scenario: No matches found

- **WHEN** a query term matches zero signals in both the current and prior windows
- **THEN** the system MUST return counts of 0 for both windows, acceleration `"stable"`, ratio 0, and an empty top signals array

### Requirement: Signal Pool Scope

The momentum tool MUST query the shared signal pool, not just signals with provenance for the current user.

#### Scenario: Cross-user signal visibility

- **WHEN** the scoring agent queries signal momentum for a term
- **THEN** the system MUST search across all signals in the signal store regardless of which user's ingestion triggered them
- **AND** MUST NOT filter signals by user-specific provenance

#### Scenario: All layers included

- **WHEN** the system searches for matching signals
- **THEN** the system MUST include signals from all ingestion layers (news, syndication, research, events, narrative, personal-graph, ai-research, email-forward, newsletter)
- **AND** MUST NOT exclude any layer from momentum calculation
