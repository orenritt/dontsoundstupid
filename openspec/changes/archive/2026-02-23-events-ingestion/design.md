## Context

Events (conferences, webinars, meetups, CFPs) are a distinct signal layer. Unlike syndication which passively monitors content streams, events have structured temporal data — dates, speakers, agendas — that change over time. Tracking deltas on events lets us surface actionable intelligence: "new CFP deadline," "keynote speaker changed," "new AI track added to conference X."

## Goals / Non-Goals

**Goals:**
- Event source registry with multi-platform support (Eventbrite, Luma, Meetup, manual)
- Normalized event model with structured fields (type, dates, location, speakers, topics)
- Delta tracking for event changes (new events, speaker changes, agenda updates, theme additions)
- Per-event poll state tracking with error handling
- Events feed into signal store with proper provenance

**Non-Goals:**
- Calendar sync with user's personal calendar (separate feature)
- Event recommendation engine ("you should attend this")
- Ticket purchasing or registration automation
- Real-time event streaming / webhooks (poll-based for MVP)

## Decisions

### Decision 1: Separate event model from signals

Events have rich structured data (speakers, agenda, location) that doesn't fit well in the generic signal metadata bag. Store full event records in `industry_events` and create corresponding signals in the signal store for briefing integration. The signal links back to the event via metadata.

### Decision 2: Delta tracking via before/after snapshots

When a change is detected on a tracked event, store the delta as a typed record with the previous value and new value. This keeps a complete audit trail and lets us generate human-readable change descriptions for briefings.

### Decision 3: Source-agnostic event model

All platforms normalize into a single IndustryEvent type. The EventSource holds platform-specific API configuration (API keys, pagination cursors, etc.) in a flexible config object, while the event itself is platform-neutral.

### Decision 4: Event tracker per-event poll state

Each tracked event has its own poll state (last checked, content hash). This allows per-event polling frequency — high-interest events (upcoming, user-relevant) can be polled more frequently than distant-future events.

## Risks / Trade-offs

- **API rate limits** — Eventbrite and Luma have rate limits that constrain polling frequency. Mitigation: respect rate limits, batch requests, prioritize high-interest events.
- **Event deduplication** — Same event may appear on multiple platforms. Mitigation: deduplicate by title + date + location similarity; handle in a future pass.
- **Speaker data quality** — Speaker names from different sources may not match cleanly. Mitigation: normalize names, defer entity resolution to a future layer.
