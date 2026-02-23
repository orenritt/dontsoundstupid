## Context

When a user adds someone to their impress list, we enrich their LinkedIn profile via PDL (name, title, company, photo) and store a row in `impress_contacts`. The knowledge graph gets a bare `person` entity with just the name. The scoring agent's `compare_with_peers` tool does a simple string match — checking if a signal's text contains the contact's name. There's no understanding of what that person cares about, their focus areas, their company's recent moves, or what topics would be relevant in conversation with them.

The existing `ai-research` module already has Perplexity and Tavily clients that we use for daily signal generation. The deep-dive feedback route already demonstrates the pattern of using Perplexity for on-demand research with user context. The personal-graph spec envisions enriched person nodes but nothing is implemented beyond the bare impress contact storage.

## Goals / Non-Goals

**Goals:**
- Run an automatic deep-dive research job when an impress contact is added (both onboarding and settings flows)
- Store structured research output on the impress contact record (interests, focus areas, recent activity, talking points)
- Seed rich knowledge entities from deep-dive findings, linked to the person via knowledge edges
- Enrich the scoring agent's `compare_with_peers` tool with deep-dive context so it can reason about *what* an impress contact cares about, not just whether their name appears in text
- Show research status and summary in the impress list UI

**Non-Goals:**
- Periodic re-research of contacts (deep dive runs once on add; refresh is a future enhancement)
- Replacing the PDL enrichment step (deep dive supplements it, doesn't replace it)
- Changing the personal-graph layer implementation (that spec is much broader; we're adding the deep-dive data that it would eventually consume)
- Deep-diving peer organizations (they already get Tavily queries in the daily research run)

## Decisions

### 1. Async deep-dive triggered from the impress POST handler

The deep dive is I/O-heavy (Perplexity + Tavily calls). Rather than blocking the POST response, we fire-and-forget the research job and return the contact immediately with `researchStatus: "pending"`. The job updates the contact record when complete.

In Next.js, we use `waitUntil` from `next/server` (available in App Router) to run the job after the response is sent. This avoids needing a separate job queue while keeping the response fast.

**Alternative considered**: Background job queue (BullMQ, Inngest). Overkill for single-user — adds infrastructure for a fire-once operation. We can migrate to a queue later if we add periodic re-research.

### 2. Research module: `src/lib/impress-deep-dive.ts`

A single module that orchestrates the deep dive for one contact. Steps:

1. **Perplexity research** — synthesized overview query: "Who is [name], [title] at [company]? What are their professional focus areas, recent publications, public talks, and what topics do they care about?" Returns a rich narrative with citations.
2. **Tavily targeted search** — two queries: "[name] [company] recent news" and "[company] announcements" (if company differs from user's own company). Returns specific articles.
3. **LLM structuring** — GPT-4o-mini takes the raw research and extracts a structured JSON object:
   - `interests`: string[] — topics and themes they care about
   - `focusAreas`: string[] — professional focus areas
   - `recentActivity`: string[] — recent talks, publications, initiatives
   - `talkingPoints`: string[] — conversation starters based on their work
   - `companyContext`: string — what their company is doing lately
   - `summary`: string — 2-3 sentence overview
4. **Store results** on the `impress_contacts` row (new `deepDiveData` JSONB column, `researchStatus` column)
5. **Seed knowledge entities** — each interest/focus area becomes a `concept` entity with source `"impress-deep-dive"`, linked to the person entity via a `"cares-about"` knowledge edge

This reuses the existing Perplexity and Tavily clients from `src/lib/ai-research/`.

### 3. Schema changes: two new columns on `impress_contacts`

- `deep_dive_data JSONB` — structured research output (nullable, null until research completes)
- `research_status TEXT DEFAULT 'none'` — one of `none`, `pending`, `completed`, `failed`

No new tables needed. The structured data lives on the contact itself because it's 1:1 with the contact and is always accessed together with it.

**Alternative considered**: Separate `impress_research` table. Rejected — adds a join for no benefit. The data is always loaded with the contact.

### 4. Knowledge graph seeding from deep-dive data

After storing the deep-dive results, we seed the knowledge graph:

- Each `interest` and `focusArea` becomes a `concept` entity with `source: "impress-deep-dive"` and `confidence: 0.7` (lower than profile-derived because it's inferred about someone else)
- A `cares-about` edge is created from the person entity to each concept entity
- The person entity itself gets updated with a richer description (the summary)

This means the scoring agent's `check_knowledge_graph` tool will naturally find these entities when evaluating signals. But more importantly, the `compare_with_peers` tool gets enriched directly.

### 5. Scoring agent enrichment: enhanced `compare_with_peers`

Currently `compare_with_peers` returns `{ name, title, company }` for each tracked contact. With deep dive data, it returns:

```
{
  name: "Sarah Chen",
  title: "CTO",
  company: "Acme Corp",
  deepDiveAvailable: true,
  interests: ["AI governance", "edge computing", "developer experience"],
  focusAreas: ["platform engineering", "ML infrastructure"],
  talkingPoints: ["Recently spoke at KubeCon about platform teams", "Acme just launched their developer portal"]
}
```

The signal-matching logic also expands: instead of just checking if the contact's name appears in signal text, we also check if any of their interests/focus areas appear. This produces richer match context for the agent.

### 6. Frontend: research status indicator + expandable summary

The impress list page (`/settings/impress-list`) shows a status badge on each contact:
- `pending` → spinner/loading indicator
- `completed` → green check, with an expandable section showing the deep-dive summary and interests
- `failed` → warning icon with retry option
- `none` → for contacts added before this feature (show "Research" button to trigger retroactively)

The contact card in the UI already shows name/title/company. We add an expandable panel below it.

## Risks / Trade-offs

- **Cost**: One Perplexity + two Tavily calls + one GPT-4o-mini structuring call per contact added. ~$0.02-0.05 per contact. Acceptable given contacts are added infrequently.
- **Latency of background job**: Deep dive takes 5-15 seconds. The user sees the contact immediately but without research data. If they check the impress list right away, they see "Researching..." which is fine UX.
- **Research quality for less-public people**: Perplexity/Tavily may return thin results for people without a public presence. The structuring LLM call handles this gracefully — it returns what it can find and the `summary` indicates confidence. We don't fail the job; we store whatever we get.
- **Stale data**: Deep dive runs once. If the person changes roles or companies, the data goes stale. Acceptable for v1 — periodic refresh is a natural follow-up.
- **Knowledge graph noise**: Seeding concepts from impress contacts' interests could add entities the user doesn't actually care about. Mitigated by using `confidence: 0.7` (lower than profile-derived at 1.0) and linking via edges so the agent understands the provenance.
