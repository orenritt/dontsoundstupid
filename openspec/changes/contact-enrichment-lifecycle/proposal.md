## Why

Contact enrichment is currently fire-and-forget: a deep dive runs when a contact is added and never again. People change jobs, shift focus areas, and publish new work — a deep dive from 6 months ago is stale. Meanwhile, calendar attendees only get basic Proxycurl enrichment (name, role, company) but never the full LLM-powered deep dive, so pre-meeting briefings lack depth about what attendees actually care about. The system needs an enrichment lifecycle: scheduled re-enrichment for core contacts, deeper pre-event enrichment for calendar attendees, and re-enrichment diffs that surface as signals.

## What Changes

- Add a scheduled re-enrichment pipeline that re-runs the full deep dive (Perplexity + Tavily + LLM structuring) for core impress contacts on a configurable interval (default: 3 months)
- Track `lastEnrichedAt` timestamp and `enrichmentVersion` on every contact to drive staleness detection
- Calendar meetings trigger opportunistic re-enrichment: if a core contact appears in a calendar invite and their enrichment is stale, re-enrich before the meeting
- New external calendar attendees (temporary contacts) get a light deep dive (Perplexity-only, skip Tavily) ahead of meetings, seeding the knowledge graph with `cares-about` edges
- Re-enrichment diffs: when re-enrichment reveals material changes (job change, new company, shifted focus areas), emit a personal-graph signal so it surfaces in briefings
- Deduplication: calendar attendees who already exist as core impress contacts must not create duplicate temporary contacts — instead, trigger a staleness check on the existing core contact
- Enrichment priority queue: meetings sooner get priority, core contacts over temporary, with API rate limit awareness

## Capabilities

### New Capabilities
_(none — all changes extend existing capabilities)_

### Modified Capabilities
- `impress-deep-dive`: Add re-enrichment lifecycle — scheduled re-runs, staleness tracking (`lastEnrichedAt`, `enrichmentVersion`), diff detection, and signal emission on material changes
- `calendar-sync`: Add pre-event enrichment for calendar attendees — light deep dive (Perplexity-only) for new external attendees, opportunistic re-enrichment for stale core contacts found in calendar invites, deduplication against existing contacts
- `personal-graph`: Add re-enrichment diff signals — when re-enrichment detects material changes (job change, company change, new focus areas), emit signals with activity type `contact-change`
- `user-profile`: Add enrichment lifecycle fields to impress contact data model (`lastEnrichedAt`, `enrichmentVersion`), add re-enrichment interval to user configuration

## Impact

- `impress-deep-dive` pipeline needs a re-run mode that diffs old vs new deep-dive data before overwriting
- `calendar-sync` attendee processing needs to check existing contacts before creating temporaries, and trigger enrichment with appropriate depth
- `personal-graph` signal emission needs a new `contact-change` activity type
- `user-profile` data model needs new fields on impress contacts and a new user-level configuration for re-enrichment interval
- Knowledge graph needs to handle entity updates from re-enrichment (update edges, add new concepts, mark stale concepts)
- Enrichment job queue/scheduler needed to manage priority and rate limits across scheduled and opportunistic enrichment requests
