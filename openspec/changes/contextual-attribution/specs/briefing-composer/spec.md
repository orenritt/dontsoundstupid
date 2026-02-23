## MODIFIED Requirements

### Requirement: LLM-Powered Composition

The system MUST use an LLM to synthesize top-scored signals into briefing items with proactive contextual attribution.

#### Scenario: Signal synthesis

- **WHEN** the composer receives scored signals for a user
- **THEN** the system MUST send the top signals along with user context to the configured LLM
- **AND** MUST produce 5 briefing items that distill the most important signals
- **AND** each item MUST be a tight synthesis, not a verbatim copy of the signal summary

#### Scenario: Attribution woven into composition

- **WHEN** the composer receives signals with attribution explanations from the scoring agent
- **THEN** the composition LLM MUST incorporate the attribution naturally into each briefing item's body text
- **AND** the attribution MUST appear as an organic part of the sentence — not as a mechanical "Why:" label or separate section
- **AND** the composition MUST preserve the dry, factual tone while explaining relevance (e.g., "Acme Corp — on your impress list — just announced..." or "Parametric modeling, an area you flagged as a knowledge gap, is seeing...")
- **AND** each composed item MUST include a separate `attribution` field in the output JSON containing the raw attribution text for downstream use

#### Scenario: LLM provider configuration

- **WHEN** the system composes a briefing
- **THEN** the system MUST use the configured LLM provider (openai or anthropic), model, max tokens, and temperature
- **AND** MUST record which model was used in the composed briefing metadata
