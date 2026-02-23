## MODIFIED Requirements

### Requirement: Selection Output

The system MUST produce structured selection output with per-signal reasoning.

#### Scenario: Selection structure

- **WHEN** the agent submits its final selections
- **THEN** each selection MUST include: signal index, reason type (from the standard set), human-readable reason label, confidence score (0-1), novelty assessment, attribution explanation, and list of tools used during evaluation
- **AND** the attribution explanation MUST be a natural-language sentence explaining why this signal is specifically relevant to the user (e.g., "You flagged parametric modeling as a knowledge gap", "Acme Corp is on your impress list and just announced layoffs", "Sarah Chen's company is expanding into your market")
- **AND** the attribution MUST reference specific elements from the user's profile, impress list, peer orgs, meetings, knowledge gaps, or feedback history — not generic statements like "relevant to your role"

#### Scenario: Reason types

- **WHEN** the agent assigns a reason to a selection
- **THEN** the reason MUST be one of: meeting-prep, people-are-talking, new-entrant, fundraise-or-deal, regulatory-or-policy, term-emerging, network-activity, your-space, competitive-move, event-upcoming, other
- **AND** the agent MUST use "meeting-prep" for any signal selected because of its relevance to an upcoming meeting
- **AND** meeting-prep reason labels MUST be specific (e.g., "Because you're meeting Sarah Chen at 2pm" not just "Meeting prep")

#### Scenario: Attribution in submit_selections tool

- **WHEN** the agent calls `submit_selections`
- **THEN** each selection object MUST include an `attribution` field containing a 1-sentence explanation of why this signal matters to this specific user
- **AND** the attribution MUST be derived from the agent's tool call results (knowledge graph lookups, peer comparisons, meeting research, expertise gap analysis, etc.)
- **AND** the agent MUST NOT produce placeholder attributions — each MUST be specific and grounded in data the agent gathered during its tool loop
