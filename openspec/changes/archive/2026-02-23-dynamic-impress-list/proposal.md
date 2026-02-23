## Why

The impress list is currently a flat array of enriched profiles set during onboarding. But in reality, the people you want to impress change constantly — new stakeholders appear, calendar meetings surface temporary contacts, post-onboarding relationships form. Without a dynamic impress list, the system's understanding of "who matters to this user" gets stale within weeks. The impress list needs three tiers: permanent (core), temporary (calendar-derived), and the ability to add/remove anytime.

## What Changes

- Restructure the impress list from a flat array into a tiered model: core (permanent, user-managed), temporary (calendar-derived, auto-managed), and the ability to promote temporary contacts to core
- Users can add new LinkedIn URLs to their impress list at any time post-onboarding
- Calendar-derived attendees are automatically treated as temporary impress contacts before meetings
- After a meeting, the system prompts: "Want to add [person] to your impress list permanently?"
- Users can remove people from their core list at any time

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-profile`: Restructure impress list from flat array to tiered model (core + temporary) with add/remove/promote operations
- `calendar-sync`: Calendar attendees automatically become temporary impress contacts; post-meeting promotion prompt

## Impact

- `src/models/identity.ts`: Restructure impress list types with tiers and source tracking
- `src/models/calendar.ts`: Add temporary impress contact linkage
- `src/models/schema.ts`: Update Zod schemas for new impress list structure
- Briefing engine (future) needs to treat both core and temporary impress contacts as relevance inputs
