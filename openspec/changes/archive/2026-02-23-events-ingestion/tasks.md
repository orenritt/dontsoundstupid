## 1. Event Types Model

- [ ] 1.1 Create `src/models/events.ts` with: EventSource (type, API config, status), IndustryEvent (title, description, event type, dates, location, speakers, topics, registration URL, source), EventDelta (change type, previous/new values, detected at), EventTracker (tracked event ID, poll state, delta history)
- [ ] 1.2 Add Zod schemas for events types in `src/models/schema.ts`
- [ ] 1.3 Export new types from `src/models/index.ts`

## 2. Database Schema

- [ ] 2.1 Add event_sources table to `src/db/schema.sql`
- [ ] 2.2 Add industry_events table with structured fields
- [ ] 2.3 Add event_deltas table for change tracking

## 3. Verify

- [ ] 3.1 Run TypeScript compiler — all files compile clean
