## 1. Schema Changes

- [x] 1.1 Add `deep_dive_data JSONB` and `research_status TEXT DEFAULT 'none'` columns to `impress_contacts` in `src/db/schema.sql`
- [x] 1.2 Add `deepDiveData` and `researchStatus` fields to the `impressContacts` Drizzle table in `src/lib/schema.ts`
- [x] 1.3 Run migration to apply the new columns

## 2. Deep-Dive Research Module

- [x] 2.1 Create `src/lib/impress-deep-dive.ts` with the `runImpressDeepDive(contactId, userId)` function that orchestrates Perplexity query, Tavily queries, and LLM structuring
- [x] 2.2 Implement the Perplexity synthesized research query (person overview: focus areas, publications, topics they care about)
- [x] 2.3 Implement the Tavily targeted searches (person + company news, company announcements)
- [x] 2.4 Implement the LLM structuring step that extracts `interests`, `focusAreas`, `recentActivity`, `talkingPoints`, `companyContext`, and `summary` from raw research
- [x] 2.5 Implement storing structured results on the `impress_contacts` row and updating `researchStatus` to `"completed"` or `"failed"`

## 3. Knowledge Graph Seeding

- [x] 3.1 Add a `seedFromDeepDive(userId, contactId, deepDiveData)` function that creates `concept` entities from interests and focus areas with `source: "impress-deep-dive"` and `confidence: 0.7`
- [x] 3.2 Generate vector embeddings for each deep-dive-derived entity
- [x] 3.3 Create `cares-about` edges from the person entity to each concept entity in `knowledge_edges`
- [x] 3.4 Update the person entity's description with the deep-dive summary
- [x] 3.5 Handle deduplication — link to existing entities via edges rather than creating duplicates

## 4. API Integration

- [x] 4.1 Update `src/app/api/user/impress/route.ts` POST handler to trigger async deep-dive after inserting the contact (using `waitUntil` or fire-and-forget pattern)
- [x] 4.2 Update the onboarding impress endpoint to trigger async deep-dive for each contact added
- [x] 4.3 Add a POST endpoint for retroactive deep-dive trigger on existing contacts with `researchStatus: "none"`
- [x] 4.4 Update the GET endpoint to include `researchStatus` and `deepDiveData` in the response

## 5. Scoring Agent Enrichment

- [x] 5.1 Update `executeCompareWithPeers` in `src/lib/scoring-agent.ts` to load `deepDiveData` from impress contacts
- [x] 5.2 Return interests, focus areas, and talking points alongside basic contact identity data in the tool response
- [x] 5.3 Expand signal-matching logic to check signal text against impress contact interests and focus areas, not just names
- [x] 5.4 Include which specific interests or focus areas matched in the signal match results

## 6. Frontend

- [x] 6.1 Update impress list page (`src/app/settings/impress-list/page.tsx`) to show research status badge per contact (spinner for pending, check for completed, warning for failed)
- [x] 6.2 Add expandable panel on completed contacts showing deep-dive summary and interests
- [x] 6.3 Add "Research" button on contacts with `researchStatus: "none"` to trigger retroactive deep dive
- [x] 6.4 Add polling or optimistic refresh to update UI when a pending deep dive completes
