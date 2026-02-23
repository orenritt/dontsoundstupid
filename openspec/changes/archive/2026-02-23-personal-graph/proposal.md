## Why

The briefing system tracks signals across syndication, research, narrative, events, and AI-research layers—but it has no awareness of the user's professional network. LinkedIn connections and impress-list contacts represent a high-signal source: when people in your graph start using new terminology, announce fundraising, or cluster around a trending topic, that's intelligence you need before your next meeting. Layer 5 closes this gap by building a watchlist from the user's network and generating personal-graph signals from observed activity.

## What Changes

- Introduce a graph model (nodes + edges) representing people and organizations derived from the user's impress list, LinkedIn connections, and auto-derived relationships.
- Add a watch system that tracks specific activity types (announcements, fundraising, hiring, new terms, content) per graph node.
- Detect and emit signals when watched activity occurs: new-term-usage, announcement, fundraising, hiring, topic-velocity.
- Store graph state in PostgreSQL with dedicated tables for nodes, edges, and watches.
- Expose configuration knobs for enrichment refresh interval, max watched nodes, and activity detection threshold.

## Capabilities

### New Capabilities
- `personal-graph`: Graph node/edge model, watch tracking, activity detection, and signal emission from the user's professional network.

### Modified Capabilities

## Impact

- New TypeScript types and Zod schemas in `src/models/`.
- New SQL tables (`graph_nodes`, `graph_edges`, `graph_watches`) in `src/db/schema.sql`.
- New export from `src/models/index.ts`.
- Depends on existing `EnrichedPerson` from identity model and `ImpressContact` from impress model.
- Signals emitted by this layer feed into the existing signal store with layer = `personal-graph`.
