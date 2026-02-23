## MODIFIED Requirements

### Requirement: Agent-Based Signal Selection

The system MUST use an LLM agent to select top signals from the candidate pool.

#### Scenario: Agent evaluates candidates

- **WHEN** a scoring run is initiated for a user
- **THEN** the system MUST present all candidate signals to an LLM agent alongside the user's full profile context (role, company, topics, initiatives, concerns, knowledge gaps, expertise areas, rapid-fire classifications) AND the user's content universe definition (coreTopics, exclusions, seismicThreshold)
- **AND** the agent MUST select the configured number of top signals (default: 5)
- **AND** the agent MUST provide a reason type and human-readable reason label for each selection

#### Scenario: Agent selection criteria

- **WHEN** the agent evaluates candidates
- **THEN** the agent MUST apply the content universe gate as priority-zero before any other evaluation criteria
- **AND** the agent MUST reject any candidate that falls outside the user's content universe unless it meets the seismic event exception criteria
- **AND** for candidates that pass the content universe gate, the agent MUST then consider (in priority order): meeting-relevance, novelty to the user, relevance to their role and concerns (including expertise gaps), momentum (whether the topic is gaining or losing public attention), actionability, coherence across selections (compound narratives, deduplication), topic diversity, and alignment with past feedback
- **AND** the agent MUST NOT select signals the user already knows about unless the development is genuinely new
- **AND** for signals with layer "news", the agent SHOULD consider GDELT tone metadata (tone_polarity, tone_positive, tone_negative) when reasoning about sentiment shifts or momentum

#### Scenario: News layer signal handling

- **WHEN** the candidate pool includes signals with layer "news"
- **THEN** the agent MUST treat them as first-class candidates alongside signals from other layers (syndication, research, events, narrative, personal-graph, ai-research)
- **AND** the agent SHOULD note when a news signal corroborates or contradicts signals from other layers, using this as evidence for or against selection

## ADDED Requirements

### Requirement: Content Universe Gate

The scoring agent MUST apply the user's content universe as a hard binary filter before any soft scoring criteria.

#### Scenario: Gate applied to every candidate

- **WHEN** the scoring agent evaluates a candidate signal
- **THEN** the agent MUST first determine whether the signal falls within the user's content universe by checking it against the coreTopics (in-scope markers) and exclusions (out-of-scope markers)
- **AND** signals that clearly match one or more coreTopics MUST pass the gate
- **AND** signals that match one or more exclusions and do NOT match any coreTopics MUST be rejected
- **AND** the agent MUST NOT apply soft relevance reasoning to rescue a signal that fails the gate — "adjacent" or "tangentially related" is NOT sufficient

#### Scenario: Seismic event exception at the gate

- **WHEN** a candidate signal fails the content universe gate (matches exclusions, does not match coreTopics)
- **THEN** the agent MUST evaluate the signal against the user's seismicThreshold criteria
- **AND** the signal MUST pass only if ALL four seismic criteria are met: involves a named entity, is a concrete verifiable event, would change what the user does this week, and a niche colleague would mention it unprompted
- **AND** if the signal passes the seismic exception, the agent MUST tag its reason as "seismic-event" and explain in the attribution why it was admitted despite being outside the content universe

#### Scenario: Gate with no content universe

- **WHEN** a scoring run is initiated for a user who does not yet have a content universe (e.g., legacy user, generation pending)
- **THEN** the agent MUST skip the content universe gate entirely
- **AND** MUST proceed with existing selection criteria (meeting-relevance, novelty, relevance, momentum, etc.)
- **AND** the scoring result MUST flag `contentUniverseApplied: false`

#### Scenario: Fewer selections when pool is filtered

- **WHEN** the content universe gate eliminates most candidates from the pool
- **THEN** the agent MUST select only from candidates that passed the gate
- **AND** it is BETTER to select fewer than the target count than to include signals that failed the gate
- **AND** the scoring result MUST report how many candidates were rejected by the gate
