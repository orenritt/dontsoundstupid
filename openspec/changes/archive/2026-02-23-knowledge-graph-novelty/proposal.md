## Why

The system currently scores signals for relevance but has no concept of whether the user already knows something. A wearables PM doesn't need to be told Apple Watch exists — they need to be told Apple Watch just filed a blood pressure patent. Without novelty filtering, briefings risk being ignored because they state the obvious. The core product promise is "never be the last to know about something you should have known about" — not "here's a summary of things you already know."

The stance: better to send nothing than send something that gets ignored.

## What Changes

- Per-user knowledge graph that tracks entities (companies, people, concepts, terms, products, events, facts) the user is presumed to know
- T-0 knowledge seeding: profile-derived entities + AI-powered industry scan to pre-populate baseline knowledge
- Novelty scoring as a multiplicative gate on relevance (high relevance × zero novelty = zero)
- Exposure tracking: every signal delivered to a user updates their knowledge graph
- Feedback-driven graph maintenance: "less of this" = they already know it, "more of this" = partial knowledge
- Zero-briefing-day handling: minimal message + interest graph refinement prompt
- "Not novel" explicit feedback type for "I already knew this" dismissals

## Capabilities

### New Capabilities
- `knowledge-graph-novelty`: Per-user knowledge graph with novelty gating, T-0 seeding, and zero-briefing-day handling

## Impact

- New knowledge entity, edge, and exposure record types
- New DB tables for knowledge graph persistence
- Modification to relevance scoring (add novelty factor, make it multiplicative)
- Modification to briefing composer (novel elements context, zero-briefing case)
- Modification to feedback system (new "not-novel" feedback type)
