## Context

Contact enrichment currently follows a one-shot pattern: when a contact is added to the impress list, the system runs a deep dive (Perplexity + Tavily + LLM structuring) and stores the results. This data is never refreshed. Calendar attendees only get basic Proxycurl enrichment (name, role, company) — no deep dive at all. The knowledge graph is seeded once from deep-dive data and never updated for that contact.

The result: after a few months, the system's understanding of who someone is and what they care about drifts from reality. Pre-meeting briefings for calendar contacts lack depth because the knowledge graph has no `cares-about` edges for those people.

Four existing specs are affected: `impress-deep-dive`, `calendar-sync`, `personal-graph`, and `user-profile`.

## Goals / Non-Goals

**Goals:**
- Core impress contacts are re-enriched on a rolling schedule so the system's understanding stays current
- Calendar meetings act as enrichment triggers: stale core contacts are refreshed opportunistically, new external attendees get a light deep dive before the meeting
- Re-enrichment produces diffs that surface as signals when material changes are detected (job changes, company changes, new focus areas)
- The knowledge graph stays current by processing enrichment updates (new edges, updated descriptions, stale concept handling)
- Enrichment work is prioritized and rate-limited to stay within API budgets

**Non-Goals:**
- Changing the deep-dive research pipeline itself (Perplexity + Tavily + LLM structuring) — it stays as-is
- Full deep dive for every calendar attendee — temporary contacts get a lighter Perplexity-only enrichment
- Real-time enrichment during meeting (only pre-meeting)
- Automatic promotion of temporary contacts to core — that remains a user decision

## Decisions

### 1. Two-tier enrichment depth

**Decision:** Core impress contacts get the full deep-dive pipeline (Perplexity + Tavily + LLM structuring). Calendar-only temporary contacts get a light deep dive (Perplexity-only, no Tavily).

**Rationale:** Full deep dive costs ~2 API calls per contact (Perplexity + Tavily). For 5-15 core contacts on a 3-month cycle, this is negligible. But a user with 10 meetings/week could have 30+ unique external attendees/month — full deep dive for all of them is expensive and low-ROI since most are transient. Perplexity-only still produces interests, focus areas, and talking points — enough to seed meaningful `cares-about` edges.

**Alternative considered:** Full deep dive for all contacts. Rejected due to cost scaling with calendar volume.

### 2. Re-enrichment interval: 90 days default, configurable per user

**Decision:** Store a `reEnrichmentIntervalDays` in user configuration (default 90). A daily job checks core contacts where `lastEnrichedAt` is older than the interval and queues them for re-enrichment.

**Rationale:** 90 days balances freshness against API cost. Most meaningful professional changes (job moves, company announcements, focus shifts) happen on quarters-level timescales. Making it configurable lets power users tighten the interval.

**Alternative considered:** Event-driven only (re-enrich only when triggered by calendar). Rejected because contacts you don't have meetings with still go stale — they appear in daily briefings via the personal graph.

### 3. Calendar meetings trigger opportunistic re-enrichment

**Decision:** When calendar sync processes attendees, it checks each external attendee against existing contacts. If a match is found and `lastEnrichedAt` is older than 50% of the re-enrichment interval (i.e., 45 days by default), the contact is queued for re-enrichment with elevated priority. This applies to both core contacts and previously-seen temporary contacts.

**Rationale:** Meetings are high-value moments — having current data about attendees directly improves briefing quality. The 50% threshold ensures contacts are refreshed before they're fully stale, biasing toward freshness when there's an imminent meeting.

**Alternative considered:** Re-enrich on every meeting regardless of staleness. Rejected because it wastes API calls for contacts enriched last week.

### 4. Diff detection and signal emission on re-enrichment

**Decision:** When a re-enrichment completes, the system diffs old vs new deep-dive data across structured fields (role, company, interests, focus areas). Material changes (job change, company change, new/dropped focus areas) emit a `contact-change` signal into the personal-graph layer. Minor changes (wording tweaks, same-company role title changes) do not emit signals.

**Rationale:** "Your investor just moved to a new firm" is high-value intelligence that should surface in briefings. But "their LinkedIn headline gained a comma" is noise. Diffing at the structured-field level (not raw text) makes material vs. minor easy to distinguish.

**Materiality rules:**
- Company changed → always material
- Role changed AND company same → material only if seniority/function shifted (VP→CEO, Engineering→Product)
- Focus areas added/removed → material if >1 area changed
- Interests changed → material if >2 items differ

### 5. Calendar contact deduplication

**Decision:** When calendar sync extracts attendees, it matches against existing contacts by email first, then by name+company fuzzy match. If a match is found against a core contact, no temporary contact is created — instead, the system checks staleness and queues re-enrichment if needed. If a match is found against an existing temporary contact, it reuses that record.

**Rationale:** Without deduplication, a recurring meeting with a board member creates a new temporary contact every time, fragmenting the knowledge graph and producing duplicate enrichment API calls.

### 6. Enrichment priority queue

**Decision:** All enrichment requests (scheduled re-enrichment, calendar-triggered, new contact deep dives) go through a shared priority queue. Priority order:
1. Calendar-triggered for meetings within 24 hours (highest)
2. Calendar-triggered for meetings within 7 days
3. New contact deep dives (user just added)
4. Scheduled re-enrichment (background)

Within each tier, core contacts before temporary contacts.

**Rationale:** API rate limits (especially Perplexity) mean we can't run everything simultaneously. Prioritizing by meeting proximity ensures the highest-value enrichments complete first.

### 7. Knowledge graph update on re-enrichment

**Decision:** Re-enrichment updates the knowledge graph incrementally:
- New `cares-about` concepts are added as edges
- Removed focus areas have their edges marked with `confidence: 0.3` (not deleted — the person may still know about these topics, just not be focused on them)
- Person entity description is updated with new summary
- Company entity is updated if the company changed (new `works-at` edge, old edge marked historical)

**Rationale:** Hard-deleting edges on re-enrichment would lose knowledge that the person was previously at a company or cared about a topic. Lowering confidence preserves the knowledge while reducing its influence on scoring.

## Risks / Trade-offs

- **[API cost scaling]** → Mitigated by two-tier enrichment (light for calendar contacts), configurable intervals, and priority queue with rate limiting. Monitor monthly API spend and alert if threshold exceeded.
- **[Stale data between re-enrichments]** → 90-day default means data can be up to 3 months old. Mitigated by calendar-triggered opportunistic refresh for contacts about to be in meetings.
- **[False-positive material diffs]** → Structured field diffing may flag non-material changes as material. Mitigated by materiality rules (multi-field threshold) and the fact that false-positive signals just get filtered by relevance scoring.
- **[Race condition: calendar sync + scheduled re-enrichment]** → Two processes could queue re-enrichment for the same contact simultaneously. Mitigated by deduplication in the priority queue (same contact = same job, don't double-queue).
- **[Perplexity-only light deep dive may miss context]** → Tavily provides targeted news that Perplexity may not surface. Acceptable because temporary contacts only need enough context for meeting prep, not long-term tracking. If promoted to core, a full deep dive runs.
