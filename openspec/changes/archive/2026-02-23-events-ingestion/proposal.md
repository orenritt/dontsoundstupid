## Why

Events — conferences, webinars, meetups, CFPs — are high-signal indicators of industry movement, emerging themes, and who's speaking about what. Today, users have to manually track event calendars across Eventbrite, Luma, Meetup, and scattered announcement pages. This layer normalizes industry events into a standard calendar model, tracks deltas (new events, theme shifts, speaker changes, agenda updates), and feeds them into the signal store so briefings can surface "CFP deadline for X conference is in 3 days" or "keynote speaker at Y changed to Z."

## What Changes

- Define event source model: tracked event platforms (Eventbrite, Luma, Meetup) and manual sources with API config
- Define industry event model: normalized calendar record with event type, dates, location, speakers, topics, registration
- Define event delta model: change detection (new events, theme additions, speaker changes, agenda updates) with before/after values
- Define event tracker model: per-event poll state and delta history
- Events are stored as signals with layer "events" and full provenance

## Capabilities

### New Capabilities
- `events-ingestion`: Normalized ingestion of industry events from multiple platforms with delta tracking for changes over time

## Impact

- New event source, event, delta, and tracker types
- New DB tables for event sources, industry events, and event deltas
- Events derived from user profiles: industry keywords, intelligence goals, geographic relevance, peer org event participation
