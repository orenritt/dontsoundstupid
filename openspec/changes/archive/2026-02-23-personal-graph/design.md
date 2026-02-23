## Context

The signal generation pipeline has five active layers (syndication, research, narrative, events, ai-research) but no layer that monitors the user's professional network. The impress list model already stores enriched contacts, and the identity model provides enrichment types. Layer 5 builds on these to create a graph of people and organizations, watch for activity, and emit signals into the shared signal store.

## Goals / Non-Goals

**Goals:**
- Model the user's professional graph as nodes (person/org) and edges (relationships).
- Track which nodes to watch and for what activity types.
- Define the signal types emitted when activity is detected.
- Persist graph state in PostgreSQL alongside existing signal tables.

**Non-Goals:**
- Implementing the actual enrichment pipeline or LinkedIn API integration (future work).
- Building the activity detection engine (this change defines the types and schema only).
- Real-time graph updates or streaming—batch processing is assumed.

## Decisions

**Graph stored in relational tables, not a graph database.**
- Rationale: The graph is small per user (hundreds to low thousands of nodes). PostgreSQL with proper indexes handles adjacency queries well. Avoids adding Neo4j/Dgraph as an infrastructure dependency.
- Alternative considered: Dedicated graph DB—rejected for operational complexity at this scale.

**Nodes reference enrichment data by ID rather than embedding it.**
- Rationale: EnrichedPerson and CompanyEnrichment already live in the identity layer. Duplicating that data creates sync issues. A UUID reference keeps the graph layer thin.

**Watch entries are per-node per-type rather than a bitmask.**
- Rationale: Individual rows allow per-type last-checked timestamps and make it easy to add/remove watch types independently. Slightly more rows but simpler queries.

**GraphSignal is a TypeScript-only type, not a new SQL table.**
- Rationale: Detected activity is emitted as a Signal (existing table) with layer = `personal-graph`. GraphSignal is the intermediate type before it becomes a Signal row. No new table needed.

## Risks / Trade-offs

- [Scale] Large LinkedIn networks (5000+ connections) could create many nodes → Mitigated by `maxWatchNodes` config cap and watch priority levels.
- [Staleness] Enrichment data drifts over time → Mitigated by `enrichmentRefreshIntervalMs` config driving periodic re-enrichment.
- [Noise] Topic velocity detection may produce false positives → Mitigated by configurable `activityDetectionThreshold`.
