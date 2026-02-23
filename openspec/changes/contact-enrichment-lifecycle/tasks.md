## 1. Data Model & Configuration

- [x] 1.1 Add `lastEnrichedAt` (nullable timestamp), `enrichmentVersion` (integer, default 0), and `enrichmentDepth` (enum: "full" | "light" | "none") fields to the impress contact data model
- [x] 1.2 Add `reEnrichmentIntervalDays` (integer, default 90, min 30) to user profile configuration
- [x] 1.3 Create database migration for new impress contact fields and user configuration field
- [x] 1.4 Update impress contact API responses to include `lastEnrichedAt`, `enrichmentVersion`, and `enrichmentDepth`

## 2. Enrichment Priority Queue

- [x] 2.1 Create enrichment job queue with priority tiers: calendar-24h (highest), calendar-7d, new-contact, scheduled-reenrichment (lowest)
- [x] 2.2 Add deduplication logic to prevent double-queuing the same contact (same contact ID = same job)
- [x] 2.3 Add rate limiting per API (Perplexity, Tavily) to queue processing
- [x] 2.4 Within each priority tier, sort core contacts before temporary contacts

## 3. Light Deep Dive Pipeline

- [x] 3.1 Create light deep dive mode in the deep-dive research pipeline: Perplexity-only (skip Tavily), same LLM structuring step
- [x] 3.2 Set `enrichmentDepth: "light"` and `confidence: 0.6` for entities from light deep dives (vs 0.7 for full)
- [x] 3.3 Seed knowledge graph with `cares-about` edges from light deep dive results with `source: "calendar-deep-dive"`

## 4. Re-Enrichment Pipeline

- [x] 4.1 Add daily staleness check: query all core contacts where `lastEnrichedAt` is older than the user's `reEnrichmentIntervalDays`, queue full deep dive jobs
- [x] 4.2 Implement re-enrichment mode in deep-dive pipeline: preserve previous `deepDiveData` until new results are ready, then swap
- [x] 4.3 Update `lastEnrichedAt`, increment `enrichmentVersion`, and set `researchStatus: "completed"` on successful re-enrichment
- [x] 4.4 On failed re-enrichment, set `researchStatus: "failed"` but preserve existing `deepDiveData`

## 5. Diff Detection & Signal Emission

- [x] 5.1 Implement structured diff comparison between old and new `deepDiveData` (compare interests, focusAreas, recentActivity, talkingPoints, companyContext, summary)
- [x] 5.2 Implement materiality rules: company changed (always material), role changed with seniority/function shift (material), >1 focus area added/removed (material), >2 interest items differ (material)
- [x] 5.3 Emit `contact-change` signal with subtypes (`company-change`, `role-change`, `focus-shift`) to signal store with layer `personal-graph` and source `re-enrichment`
- [x] 5.4 Include before/after values in signal details for each material change

## 6. Knowledge Graph Updates on Re-Enrichment

- [x] 6.1 On re-enrichment: create new `cares-about` edges for newly discovered focus areas and interests
- [x] 6.2 On re-enrichment: reduce confidence to 0.3 on `cares-about` edges for focus areas no longer present (do not delete)
- [x] 6.3 Update person entity description with new deep-dive summary
- [x] 6.4 On company change: create new `works-at` edge to new org node, mark old `works-at` edge as historical with end timestamp, create new org node if needed

## 7. Calendar Contact Deduplication

- [x] 7.1 Add email-based deduplication: match calendar attendees against existing contacts by email before creating temporary contacts
- [x] 7.2 Add fuzzy name+company deduplication as fallback when no email match found
- [x] 7.3 When a match is found against a core contact, skip temporary creation and link the meeting to the existing contact

## 8. Calendar-Triggered Enrichment

- [x] 8.1 During calendar sync attendee processing, check each external attendee against existing contacts (dedup step from task 7)
- [x] 8.2 For matched core contacts: check if `lastEnrichedAt` is older than 50% of `reEnrichmentIntervalDays`, if so queue re-enrichment with calendar-priority
- [x] 8.3 For new unmatched attendees: create temporary contact and queue light deep dive with priority based on meeting proximity
- [x] 8.4 For matched existing temporary contacts: reuse existing record and link to new meeting

## 9. Promotion Enrichment Upgrade

- [x] 9.1 On promotion of temporary contact to core: check if `enrichmentDepth` is `"light"`, if so queue a full deep dive (Perplexity + Tavily)
- [x] 9.2 Update `enrichmentDepth` to `"full"` and update knowledge graph with richer results after full deep dive completes
