## Why

When a user adds someone to their impress list, we only store basic LinkedIn profile data (name, title, company). The knowledge graph gets a bare `person` entity with just a name. The scoring agent has almost nothing to work with when trying to find signals that would help the user sound smart in front of that person. A deep dive — researching what that person cares about, what they've published, their company's recent moves, and their professional focus areas — would dramatically improve the relevancy of signals selected for "impress" purposes. This is the core value proposition of the product and it's currently hollow.

## What Changes

- When an impress contact is added (during onboarding or from settings), trigger an async deep-dive research job on that person using Perplexity/Tavily
- Store structured research output (interests, recent publications, company initiatives, talking points, focus areas) on the impress contact record
- Seed the knowledge graph with rich entities derived from the deep-dive — not just the person's name, but the concepts, companies, terms, and topics they care about, linked back to the person entity
- Give the scoring agent access to impress contact deep-dive data so it can match signals to what specific people on the impress list care about
- Surface deep-dive results in the impress list UI so the user can see what was learned

## Capabilities

### New Capabilities

- `impress-deep-dive`: Research pipeline that runs a deep dive on impress contacts when they are added, stores structured findings, and seeds the knowledge graph with derived entities

### Modified Capabilities

- `user-profile`: Impress contact records gain structured deep-dive fields (interests, focus areas, recent activity, talking points) and a research status indicator
- `knowledge-graph-novelty`: Knowledge seeding must handle deep-dive-derived entities linked to impress contacts, not just bare person names
- `relevance-scoring`: The `compare_with_peers` tool must surface deep-dive context (what the person cares about) alongside basic match data, so the agent can reason about impress-relevance at a deeper level

## Impact

- **Schema**: `impress_contacts` table needs new columns for deep-dive data and research status
- **API**: Impress POST endpoints (onboarding + settings) need to trigger async deep-dive jobs
- **Libs**: New deep-dive research module using existing Perplexity/Tavily integrations; knowledge-seed must be extended to process deep-dive output
- **Scoring agent**: `compare_with_peers` tool needs enrichment with deep-dive context
- **Frontend**: Impress list UI should show research status and deep-dive summary per contact
