## Context

The user profile and onboarding flow exist but have no awareness of the user's calendar. Calendar data is a high-value dynamic signal — it tells us who the user is meeting, when, and potentially why. This integration is optional; the core product works without it, but calendar-aware briefings are significantly more actionable.

## Goals / Non-Goals

**Goals:**
- Define the calendar connection and meeting sync data model
- Support both Google Calendar and Outlook via their respective APIs
- Enrich meeting attendees using the same person enrichment pipeline (Proxycurl)
- Generate per-meeting intelligence sections in the daily briefing
- Make calendar connection an optional, skippable onboarding step

**Non-Goals:**
- Writing to the user's calendar (read-only access)
- Real-time meeting notifications or reminders
- Supporting calendar providers beyond Google and Outlook
- Implementing the actual OAuth flows or API calls (schema and types only for now)

## Decisions

### Decision 1: Calendar types as a separate model file

Create `src/models/calendar.ts` for all calendar-related types. Calendar data is a distinct concern — it's not identity, not context, not peers. It's a dynamic signal layer that refreshes continuously. Alternative: folding into context layer — rejected because calendar data has its own lifecycle (OAuth, sync intervals) that doesn't fit the conversation-driven context model.

### Decision 2: Attendee enrichment reuses person enrichment

Meeting attendees are enriched through the same Proxycurl pipeline as the impress list. We do email-to-LinkedIn resolution first, then standard person enrichment. This avoids building a separate enrichment path. Alternative: lightweight attendee lookup without full enrichment — possible future optimization but full enrichment gives better meeting intelligence.

### Decision 3: 7-day rolling sync window

Sync meetings for the next 7 days. This gives enough lead time for the system to enrich attendees and generate intelligence without pulling excessive historical or far-future data. Re-sync every 6 hours to catch changes. Alternative: sync only next 24 hours — rejected because attendee enrichment takes time and we want to be ready before the meeting day.

### Decision 4: Calendar provider as discriminated union

Same pattern as delivery channels — use a discriminated union keyed on provider (Google vs Outlook) so each carries its own OAuth config. Alternative: generic calendar interface — rejected because Google and Outlook APIs differ enough that provider-specific config is needed.

### Decision 5: Optional onboarding step placement

Calendar connection comes after peer review and (if delivery-preferences is applied) after delivery preferences, just before profile completion. It's presented as an upgrade, not a requirement. The pitch emphasizes the concrete benefit: knowing who you're meeting and what they care about.

## Risks / Trade-offs

- **OAuth complexity** — Calendar APIs require OAuth consent, token refresh, and secure credential storage. Mitigation: schema only for now; actual OAuth implementation is a future change.
- **Attendee enrichment cost** — Frequent meetings with many attendees could trigger many enrichment API calls. Mitigation: cache enriched profiles, deduplicate across meetings, prioritize external attendees over internal colleagues.
- **Calendar permission sensitivity** — Users may be wary of granting calendar access. Mitigation: clearly communicate read-only access, explain the specific benefit, make it easy to disconnect.
