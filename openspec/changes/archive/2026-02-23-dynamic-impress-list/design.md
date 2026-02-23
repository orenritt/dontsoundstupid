## Context

The impress list is currently a flat array of EnrichedPerson objects in the identity layer. It has no concept of tiers, sources, or lifecycle. This needs to become a richer structure that supports core (permanent) and temporary (calendar-derived) contacts with add/remove/promote operations.

## Goals / Non-Goals

**Goals:**
- Restructure impress list from flat EnrichedPerson[] to a tiered model with source tracking and active/inactive status
- Support post-onboarding add/remove of core contacts
- Automatically create temporary contacts from calendar meeting attendees
- Post-meeting promotion prompt flow
- Unified view for the briefing engine that merges core + active temporary

**Non-Goals:**
- Building the actual promotion prompt UI/channel interaction (schema only)
- Implementing enrichment API calls for newly added contacts
- Weighting logic for core vs temporary in the briefing engine

## Decisions

### Decision 1: ImpressContact wraps EnrichedPerson with metadata

Rather than changing EnrichedPerson, we wrap it in an ImpressContact type that adds: source (onboarding, user-added, promoted-from-calendar), tier (core, temporary), status (active, inactive), linked meeting ID (for temporary contacts), and timestamps. This keeps EnrichedPerson pure (it's reused elsewhere) while adding impress-specific lifecycle.

### Decision 2: Impress list moves from identity layer to its own field

The impress list has its own lifecycle (add/remove/promote) that's more dynamic than the identity layer. It sits alongside identity and context in the UserProfile, not nested inside identity. The identity layer keeps the user's own enrichment and company enrichment.

### Decision 3: Temporary contacts have an active window, not a boolean

Temporary contacts have an activeFrom/activeUntil window tied to the meeting time (e.g., 24 hours before to 24 hours after). This is more flexible than a simple on/off and lets the briefing engine know exactly when a temporary contact is relevant.

### Decision 4: Soft delete for removals

Removing a contact marks it inactive rather than deleting it. This preserves history and allows re-adding without re-enriching. The context snapshot captures the removal.

## Risks / Trade-offs

- **Impress list growth** — Active calendar users could accumulate many temporary contacts. Mitigation: temporary contacts auto-expire; only enriched external attendees become temporary (skip internal colleagues).
- **Promotion prompt fatigue** — Prompting after every meeting could be annoying. Mitigation: only prompt for external attendees who aren't already in the core list, batch prompts rather than one per person.
