## MODIFIED Requirements

### Requirement: Zero-Briefing Day Handling

The system MUST handle days when no signals meet the quality bar, distinguishing between "nothing novel" and "nothing interesting enough."

#### Scenario: No novel signals

- **WHEN** all relevant signals are filtered out by novelty scoring (signals exist but the user already knows about them)
- **THEN** the system MUST send a minimal message acknowledging nothing new was found
- **AND** MUST include a refinement prompt suggesting interest graph expansions
- **AND** MUST report how many signals were relevant but not novel (transparency)

#### Scenario: No interesting signals

- **WHEN** the scoring agent returns zero selections because no candidates cleared the interestingness threshold (signals exist and may be novel, but none are worth the user's time)
- **THEN** the system MUST NOT send any message — silence is the correct response
- **AND** MUST record the pipeline status as `"skipped-nothing-interesting"` with the candidate count and scoring reasoning
- **AND** MUST NOT trigger interest graph refinement prompts (the user's interests are fine — the signal pool just had a quiet day)

#### Scenario: Distinguishing skip reasons in pipeline tracking

- **WHEN** a zero-briefing day occurs
- **THEN** the system MUST record a distinct status that differentiates between:
  1. `"skipped-no-signals"` — no candidate signals existed at all (ingestion issue)
  2. `"skipped-nothing-novel"` — signals existed but none were novel to the user
  3. `"skipped-nothing-interesting"` — signals existed and may be novel, but none cleared the interestingness bar
- **AND** each status MUST include metadata appropriate to its cause (e.g., candidate count, novelty scores, scoring reasoning)

#### Scenario: Interest graph refinement

- **WHEN** generating a refinement prompt (only for the "nothing novel" case)
- **THEN** the system MUST use the LLM to analyze what was filtered out and suggest adjacent topic areas the user might want to track
- **AND** MUST allow the user to accept/reject suggested expansions which update their profile
