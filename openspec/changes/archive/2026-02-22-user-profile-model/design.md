## Context

This is a greenfield project. We're defining the foundational data model and the first user-facing flow for Don't Sound Stupid — a personalized professional intelligence briefing system. Everything downstream (the briefing engine, signal matching, daily delivery) depends on a rich, accurate user profile.

## Goals / Non-Goals

**Goals:**
- A user profile schema rich enough to power personalized daily briefings
- An onboarding flow that's fast (under 10 minutes) but produces high-quality context
- Clean separation between stable enrichment data and evolving user context

**Non-Goals:**
- Building the briefing engine (future change)
- Implementing enrichment API integrations (we define the schema; actual API calls come later)
- Building a UI (the onboarding conversation could start as a CLI or chat-style flow)

## Decisions

### Decision 1: TypeScript + JSON Schema for the profile model

Use TypeScript interfaces as the source of truth for the profile shape, with JSON Schema for runtime validation. This gives us type safety during development and schema validation when persisting/loading profiles.

### Decision 2: Two-layer architecture — identity and context

The identity layer (enrichment data) and context layer (conversation data) are stored as separate objects within a unified profile. This allows the identity layer to be refreshed independently (periodic re-enrichment) without disturbing user-provided context.

### Decision 3: Impress list as enriched profiles

The impress list stores full enriched profile data for each person, not just names or URLs. This allows the system to derive what topics and industries matter to the people the user wants to impress, which directly feeds briefing relevance.

### Decision 4: Peer orgs include user feedback

Each peer organization entry stores the system's suggestion, the user's Y/N confirmation, and an optional free-text comment. The comments ("they're enterprise, we're consumer") are valuable signal for the briefing engine and should be preserved, not discarded.

### Decision 5: Context layer is append-friendly

When users update their context (new initiatives, shifted concerns), we keep historical entries with timestamps rather than overwriting. This lets us track how their focus evolves over time, which could inform briefing relevance weighting.
