## Context

The system ingests content through six layers (news queries, query refresh, AI research templates, AI research LLM queries, syndication discovery, knowledge gap scan). Each layer independently broadens the user's topics — extracting parent categories, searching for "adjacent" content, and exploring "white space." The scoring agent then selects from a candidate pool that's already dominated by off-topic signals. The core product value is hyper-specific relevance, but the architecture is optimized for breadth.

Current flow: `topics (broad) → independent queries → broad candidates → soft scoring`

Target flow: `content universe (tight) → intersectional queries → scoped candidates → hard gate + soft scoring`

## Goals / Non-Goals

**Goals:**
- Every signal in a user's briefing should be undeniably within their specific professional niche
- Content outside the universe is rejected by default, with a narrow exception for seismic events
- The content universe is derived automatically — users never see or manage it
- Feedback tightens the universe over time (exclusions accumulate, scope sharpens)
- Query derivation produces fewer, more targeted queries rather than many broad ones

**Non-Goals:**
- User-facing content universe editing or approval UI
- Changing the scoring agent's tool set or multi-round architecture
- Modifying the onboarding conversation flow or questions
- Changing how impress list / peer org queries are derived (those are already entity-specific)
- Real-time content universe updates (batch refresh is sufficient)

## Decisions

### Decision 1: Content Universe as a Structured Object, Not Free Prose

The content universe is stored as a structured JSON object with distinct fields rather than a single prose blob. This gives downstream consumers (query derivation, scoring agent, syndication discovery) machine-readable access to specific facets without re-parsing prose.

**Structure:**

```typescript
interface ContentUniverse {
  // The tight definition of what's in scope
  definition: string;        // 2-4 sentence prose description of the user's exact niche
  
  // Specific scope markers
  coreTopics: string[];      // Intersectional descriptors, not parent categories
                             // e.g. ["parametric insurance for ecosystem restoration",
                             //        "coral reef risk transfer mechanisms"]
                             //  NOT ["insurtech", "climate risk"]
  
  // Hard exclusions
  exclusions: string[];      // Explicit parent categories / adjacent fields to reject
                             // e.g. ["general insurtech", "cyber insurance", 
                             //        "embedded insurance", "digital claims"]

  // Seismic event threshold description  
  seismicThreshold: string;  // Prose criteria for the narrow exception
                             // e.g. "Only if a top-10 global insurer/reinsurer enters 
                             //  the nature-based insurance space, or a regulatory body 
                             //  creates rules specifically for parametric environmental 
                             //  products"
  
  // Metadata
  generatedAt: string;       // ISO timestamp
  generatedFrom: string[];   // Which profile fields contributed
  version: number;           // Incremented on regeneration
}
```

**Why not free prose?** Query derivation needs `coreTopics` to build intersectional search queries. The scoring agent needs `exclusions` to apply the hard gate. A prose blob would require each consumer to re-interpret it, introducing inconsistency.

**Why not just better topics?** Topics are inherently a flat list of independent keywords. The content universe captures the *intersection* and the *boundaries* — what's in AND what's out. You can't represent "parametric insurance for ecosystem restoration, NOT general insurtech" as a topic list.

**Alternative considered:** Embedding-based similarity filtering (embed the universe definition, compute cosine similarity against each signal). Rejected because embeddings are too fuzzy for hard boundaries — "insurtech" and "nature-based insurance" would have high cosine similarity, which is exactly the false positive we're trying to eliminate. The gate needs to be semantic/LLM-based, not vector-based.

### Decision 2: Generation Happens at Three Trigger Points

The content universe is generated/regenerated at:

1. **After onboarding completion** — first generation, using all available profile data
2. **After profile updates** — when parsedTopics, initiatives, concerns, or rapidFire classifications change
3. **After feedback accumulation** — when 3+ "tune-less" or "not-relevant" feedback signals have accumulated since last generation

Generation is idempotent — if inputs haven't materially changed, the version number stays the same. The `generatedFrom` array tracks which profile fields contributed, so we can detect whether a profile change actually affects the universe.

**Why not regenerate on every pipeline run?** Unnecessary LLM cost. The universe changes slowly — it's tied to the user's professional identity, not daily news cycles. Feedback accumulation (trigger 3) handles gradual drift.

**Why not let users trigger regeneration?** Non-goal. Users don't know the universe exists. If their profile changes, regeneration happens automatically.

### Decision 3: LLM-Based Gate in Scoring Agent, Not Pre-Filter

The content universe gate is implemented as instructions in the scoring agent's system prompt, not as a separate pre-filtering LLM call before the agent runs.

**Approach:** Add a "CONTENT UNIVERSE GATE" section to `buildSystemPrompt` that includes the full universe definition, coreTopics, exclusions, and seismic threshold. The agent applies this as priority-zero before any other evaluation criteria.

**Why not a separate pre-filter step?** 
- Adding another LLM call increases latency and cost
- The scoring agent already evaluates every candidate — it can apply the gate in the same pass
- The agent has access to tools (knowledge graph, provenance, etc.) that inform borderline gate decisions
- A separate filter would need to duplicate the seismic event reasoning

**Why not a deterministic keyword filter?** Too brittle. "Insurtech" appearing in an article about Lloyd's launching a nature-based insurance syndicate should pass the gate — keyword matching can't make that distinction. The gate must be semantic.

**Trade-off:** This makes the scoring agent's prompt longer and its task harder. Mitigated by making the gate instructions very explicit and structured (not vague "be relevant" language).

### Decision 4: Topic Extraction Produces Intersectional Descriptors

The `parse-transcript.ts` prompt is rewritten to produce two kinds of topics:

1. **Niche descriptors** — phrases that capture the user's specific intersection (e.g., "parametric insurance for coral reef restoration"). These become the content universe's `coreTopics`.
2. **Context terms** — individual terms that provide context but are NOT used as standalone search queries (e.g., "insurance", "coral reefs"). These are stored separately and used only as supporting context, never as query inputs.

**Why two tiers?** A person who works in "nature-based insurance" needs the system to understand both "insurance" and "nature-based solutions" as context — but neither should ever be a standalone search query. Only the intersection matters.

### Decision 5: Query Derivation Uses Universe-Scoped Templates

Instead of `topic → bare query`, query derivation becomes:

- **News queries:** Each `coreTopics` entry becomes a quoted phrase query, not a bare keyword. Exclusions are appended as negative keywords where the API supports it.
- **AI research templates:** Questions are scoped with the universe definition. Instead of `"What should a VP know about insurtech?"` → `"What recent developments in nature-based parametric insurance products (coral reef risk transfer, mangrove coverage, biodiversity credits) should a VP at NatureRisk know about? Do NOT include general insurtech, digital claims, or cyber insurance."` 
- **Query refresh:** The prompt explicitly receives the exclusion list and is instructed to go deeper within the universe, not broader.
- **Knowledge gap scan:** Gaps are constrained to the universe — "emerging concepts within nature-based insurance" not "cross-industry trends."

### Decision 6: Feedback Evolves Exclusions Additively

When a user signals "tune-less" or "not-relevant" on a briefing item, the system extracts the topic/category of that item and adds it to the content universe's exclusion candidates. After 3+ exclusion candidates accumulate, the universe is regenerated with these as additional exclusion inputs.

"Tune-more" signals confirm existing coreTopics — they don't add new ones, but they increase confidence that the current scope is correct.

This is additive only — exclusions accumulate, they don't reset. The universe gets tighter over time, never broader.

**Why accumulate before regenerating?** A single "tune-less" might be noise. Three signals about the same adjacent category is a pattern.

## Risks / Trade-offs

**Risk: Over-filtering on day one.** A new user's content universe might be too tight if the onboarding conversation was brief, causing empty briefings.
→ Mitigation: First-generation universe includes a slightly wider scope. Tightening happens through feedback, not on initial generation. The seismic threshold starts generous and narrows with feedback.

**Risk: Seismic event gate is subjective.** Two different LLM calls might disagree on whether an event is "seismic."
→ Mitigation: The seismic threshold is defined in concrete, observable terms (named entity + concrete event + direct impact on user's week). The scoring agent sees it as structured criteria, not a vague instruction.

**Risk: Query recall drops too much.** Very specific intersectional queries may return zero results from NewsAPI/GDELT.
→ Mitigation: Each coreTopics entry generates 2-3 query variants at different specificity levels. If the most specific returns nothing, the system falls back to slightly broader (but still universe-scoped) queries. Impress list and peer org queries are unchanged — those are already entity-specific.

**Risk: Content universe generation quality depends on profile richness.** Sparse profiles produce vague universes.
→ Mitigation: The generator falls back to broader (but still intersectional) scoping when profile data is thin. As feedback accumulates, the universe sharpens regardless of initial profile quality.

**Risk: Migration for existing users.** Users who already have profiles need content universes generated retroactively.
→ Mitigation: A backfill script generates content universes for all existing users. Until generated, the system falls back to current behavior (no gate applied).
