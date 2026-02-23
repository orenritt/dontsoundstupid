## ADDED Requirements

### Requirement: Interestingness Threshold

The scoring agent MUST evaluate each candidate signal against an absolute interestingness bar before including it in selections. Signals that do not clear the bar MUST be excluded regardless of their relative rank within the candidate pool.

#### Scenario: Interestingness criteria applied

- **WHEN** the scoring agent evaluates a candidate signal for selection
- **THEN** the agent MUST apply all of the following criteria before selecting:
  1. **Sharp colleague test**: A knowledgeable person in the user's exact niche would mention this unprompted
  2. **Concreteness**: The signal involves a specific event, number, entity, or development — not a trend piece, think piece, or rehash
  3. **Recency**: The development is genuinely new — not a repackaging of previously known information
  4. **Consequence**: The signal changes what the user would say, do, or think about something this week
- **AND** signals that fail any of these criteria MUST NOT be selected, even if they are the best available in the pool

#### Scenario: Momentum lowers the bar

- **WHEN** the scoring agent has called `check_signal_momentum` and a topic is classified as `"surging"` or `"rising"` in the signal pool
- **THEN** the agent MUST treat the momentum evidence as a factor that lowers the interestingness bar for signals about that topic
- **AND** the agent MUST still require concreteness and recency — momentum alone does not make a vague or stale signal interesting

#### Scenario: Agent selects fewer than target count

- **WHEN** fewer than `targetSelections` candidates clear the interestingness bar
- **THEN** the agent MUST select only those that clear the bar
- **AND** MUST NOT pad selections with signals that fail the interestingness criteria

#### Scenario: Agent selects zero signals

- **WHEN** no candidates clear the interestingness bar
- **THEN** the agent MUST submit an empty selections array via `submit_selections`
- **AND** the system MUST treat this as a valid scoring result, not a failure or malformed submission

### Requirement: Signal Pool Momentum Tool

The scoring agent MUST have access to a `check_signal_momentum` tool for querying internal signal pool acceleration.

#### Scenario: Momentum tool available

- **WHEN** the scoring agent's tool definitions are constructed
- **THEN** the system MUST include `check_signal_momentum` in the available tools list
- **AND** the tool definition MUST describe its purpose (detecting what is picking up steam in the signal pool), arguments (queries array, optional windowDays), and return format (per-query frequency, acceleration classification, recent matching signals)

#### Scenario: Agent uses momentum for selection

- **WHEN** the agent calls `check_signal_momentum` during a scoring run
- **THEN** the system MUST execute the signal pool momentum query and return results
- **AND** the tool call MUST be logged in the tool call log alongside other tool calls

#### Scenario: Momentum combined with Google Trends

- **WHEN** the agent has results from both `check_signal_momentum` (internal) and `query_google_trends` (external)
- **THEN** the agent SHOULD use both signals together — a topic surging in both the signal pool and public search interest is strong evidence of genuine emerging relevance

## MODIFIED Requirements

### Requirement: Agent-Based Signal Selection

The system MUST use an LLM agent to select top signals from the candidate pool.

#### Scenario: Agent evaluates candidates

- **WHEN** a scoring run is initiated for a user
- **THEN** the system MUST present all candidate signals to an LLM agent alongside the user's full profile context (role, company, topics, initiatives, concerns, knowledge gaps, expertise areas, rapid-fire classifications)
- **AND** the agent MUST select up to the configured number of top signals (default: 5) that clear the interestingness threshold
- **AND** the agent MUST provide a reason type and human-readable reason label for each selection
- **AND** the agent MAY return fewer selections than the configured target, including zero, when insufficient candidates clear the interestingness bar

#### Scenario: Agent selection criteria

- **WHEN** the agent evaluates candidates
- **THEN** the agent MUST consider (in rough priority order): interestingness threshold (absolute bar), novelty to the user, relevance to their role and concerns (including expertise gaps), momentum (whether the topic is gaining or losing attention both publicly and in the signal pool), actionability (especially meeting-relevance), coherence across selections (compound narratives, deduplication), topic diversity, and alignment with past feedback
- **AND** the agent MUST NOT select signals the user already knows about unless the development is genuinely new
- **AND** for signals with layer "news", the agent SHOULD consider GDELT tone metadata (tone_polarity, tone_positive, tone_negative) when reasoning about sentiment shifts or momentum

#### Scenario: News layer signal handling

- **WHEN** the candidate pool includes signals with layer "news"
- **THEN** the agent MUST treat them as first-class candidates alongside signals from other layers (syndication, research, events, narrative, personal-graph, ai-research)
- **AND** the agent SHOULD note when a news signal corroborates or contradicts signals from other layers, using this as evidence for or against selection

### Requirement: Selection Output

The system MUST produce structured selection output with per-signal reasoning.

#### Scenario: Selection structure

- **WHEN** the agent submits its final selections
- **THEN** each selection MUST include: signal index, reason type (from the standard set), human-readable reason label, confidence score (0-1), novelty assessment, and list of tools used during evaluation

#### Scenario: Empty selection submission

- **WHEN** the agent submits `submit_selections` with an empty selections array
- **THEN** the system MUST accept this as a valid submission
- **AND** MUST return a scoring result with `selections: []` and the full reasoning chain and tool call log
- **AND** MUST NOT prompt the agent to try again or treat the empty array as malformed

#### Scenario: Reason types

- **WHEN** the agent assigns a reason to a selection
- **THEN** the reason MUST be one of: meeting-prep, people-are-talking, new-entrant, fundraise-or-deal, regulatory-or-policy, term-emerging, network-activity, your-space, competitive-move, event-upcoming, other
- **AND** the agent MUST use "meeting-prep" for any signal selected because of its relevance to an upcoming meeting
- **AND** meeting-prep reason labels MUST be specific (e.g., "Because you're meeting Sarah Chen at 2pm" not just "Meeting prep")
