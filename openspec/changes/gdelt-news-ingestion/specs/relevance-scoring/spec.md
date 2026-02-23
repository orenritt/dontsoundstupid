## MODIFIED Requirements

### Requirement: Agent-Based Signal Selection

The system MUST use an LLM agent to select top signals from the candidate pool.

#### Scenario: Agent evaluates candidates

- **WHEN** a scoring run is initiated for a user
- **THEN** the system MUST present all candidate signals to an LLM agent alongside the user's full profile context (role, company, topics, initiatives, concerns, knowledge gaps, expertise areas, rapid-fire classifications)
- **AND** the agent MUST select the configured number of top signals (default: 5)
- **AND** the agent MUST provide a reason type and human-readable reason label for each selection

#### Scenario: Agent selection criteria

- **WHEN** the agent evaluates candidates
- **THEN** the agent MUST consider (in rough priority order): novelty to the user, relevance to their role and concerns (including expertise gaps), momentum (whether the topic is gaining or losing public attention), actionability (especially meeting-relevance), coherence across selections (compound narratives, deduplication), topic diversity, and alignment with past feedback
- **AND** the agent MUST NOT select signals the user already knows about unless the development is genuinely new
- **AND** for signals with layer "news", the agent SHOULD consider GDELT tone metadata (tone_polarity, tone_positive, tone_negative) when reasoning about sentiment shifts or momentum

#### Scenario: News layer signal handling

- **WHEN** the candidate pool includes signals with layer "news"
- **THEN** the agent MUST treat them as first-class candidates alongside signals from other layers (syndication, research, events, narrative, personal-graph, ai-research)
- **AND** the agent SHOULD note when a news signal corroborates or contradicts signals from other layers, using this as evidence for or against selection
