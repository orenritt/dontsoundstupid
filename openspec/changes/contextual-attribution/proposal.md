## Why

When the system surfaces information in a briefing, users don't know *why* it was included. The data to explain this already exists — signal provenance tracks trigger reasons (impress-list, peer-org, personal-graph, etc.), relevance scoring computes per-factor breakdowns, and calendar sync knows about upcoming meetings. But none of this is exposed to the user proactively. Users should see explanations like "Because you're seeing Jim today..." or "Because Acme Corp is on your impress list..." directly in the briefing, not only when they ask "tell me more." This transforms the briefing from a passive information dump into an intelligent assistant that shows its reasoning.

## What Changes

- The briefing composer MUST proactively include contextual attribution for each briefing section, explaining why it was surfaced (e.g., meeting context, impress-list relevance, intelligence goal alignment, personal-graph connection)
- Attribution MUST be derived from signal provenance records and relevance score breakdowns — the data already exists, it just needs to be surfaced
- Meeting-driven items MUST explicitly reference the specific meeting and attendee (e.g., "Because you're meeting Jim Chen at 2pm...")
- The relevance scoring engine MUST output a human-readable "top reason" summary alongside the numeric score breakdown, so the composer has a natural-language explanation to work with
- Attribution framing MUST adapt to the briefing format (concise/standard/detailed) — concise gets a short parenthetical, standard gets a contextual lead-in sentence, detailed gets a full relevance explanation

## Capabilities

### New Capabilities
_(none)_

### Modified Capabilities
- `briefing-composer`: Add proactive contextual attribution to each briefing section, using provenance and scoring data to explain why information was surfaced. Meeting-related items must explicitly reference the meeting/attendee. Attribution must adapt to format preference.
- `relevance-scoring`: Add a human-readable "top reason" summary to the score output, derived from the dominant scoring factors and provenance data, for use by the composer.

## Impact

- **briefing-composer**: LLM prompt must include provenance trigger reasons and top scoring factors per signal. Composition logic must weave attribution into each section. All three format modes (concise/standard/detailed) need format-appropriate attribution.
- **relevance-scoring**: ScoredSignal output must include a new `topReason` field with a human-readable explanation of why the signal scored high.
- **Models**: ScoredSignal type needs a `topReason: string` field. ComposedBriefing section model may need an `attribution` field.
- **LLM prompts**: System prompt for briefing composition must instruct the LLM to incorporate attribution naturally (not as mechanical labels).
