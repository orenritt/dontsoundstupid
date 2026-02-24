## Context

The content universe was introduced to scope what signals are relevant to a user. It contains `coreTopics` (intersectional niche descriptors), `exclusions` (topics explicitly out of scope), and a `definition` (natural-language description of the user's niche). Currently, only `deriveFromTopics` uses the content universe — the other three query sources (impress-list, peer-org, intelligence-goal) send broad unscoped queries to NewsAPI.ai, and there's no programmatic filter on fetched results before they enter the signal store.

## Goals / Non-Goals

**Goals:**
- Every query sent to the news API should be scoped to the user's content universe when one exists
- Signals that are clearly outside the content universe should be dropped before storage, not just at scoring time
- Reduce API noise and quota waste from irrelevant results

**Non-Goals:**
- Changing how the content universe is generated or structured
- Modifying the scoring agent gate (it stays as a final safety net)
- Filtering signals from non-news layers (syndication, research, etc. have their own pipelines)
- Retroactively cleaning up already-stored signals

## Decisions

### 1. Query scoping: append content universe context to entity queries

**Approach:** When a content universe exists, modify each query source to combine the entity name with content universe context:

- **Impress-list:** `"Google" AND ("cloud infrastructure" OR "enterprise AI")` — append top 2-3 coreTopics as OR'd phrases after the company name
- **Peer-org:** Same pattern — `"CompetitorCo" AND ("cloud infrastructure" OR "enterprise AI")`
- **Intelligence-goal:** Prepend the universe definition context to the goal detail. Since goal details are already natural-language phrases, this scopes them naturally.

**Why not a broader AND clause?** NewsAPI.ai phrase search is already narrow. Adding too many AND terms returns zero results. Using the top 2-3 coreTopics as an OR group balances relevance against recall.

**Alternatives considered:**
- Running the full content universe through an LLM to generate scoped queries per entity → too expensive, too slow, and the LLM query refresh already does this
- Dropping impress-list/peer-org queries entirely when content universe exists → loses valuable entity-tracking capability

### 2. Post-fetch relevance filter: fast keyword matching before storage

**Approach:** After fetching articles but before inserting into the `signals` table, run a fast programmatic check:

1. Concatenate article title + summary into a single lowercase string
2. Check if any `coreTopics` entry appears as a substring (case-insensitive)
3. Check if any `exclusions` entry appears as a substring
4. **Pass** if at least one coreTopic matches AND no exclusion-only match (exclusion without any coreTopic match)
5. **Pass** all articles when content universe is null (no filtering)

This is intentionally loose — it's a coarse pre-filter, not a precision gate. The scoring agent handles fine-grained judgment. The goal is to catch obvious misses like a Google earnings report when the user only cares about Google Cloud.

**Why not an LLM filter?** Cost and latency. We fetch 25 articles × N queries per cycle. Even a cheap LLM call per article would multiply ingestion cost significantly. The keyword match is free and catches the worst offenders.

**Alternatives considered:**
- Embedding-based similarity filter → requires embedding each article, adds latency and cost
- No post-fetch filter, rely on scoring agent → current state, lets noise into the pool

### 3. Content universe loading: single load per ingestion cycle

Load the content universe once at the start of `pollNewsQueries` for each user's queries (group queries by userId, load profile once). Pass it through to both query construction and post-fetch filtering. Avoids N database lookups.

## Risks / Trade-offs

- **[Reduced recall]** Scoping impress/peer queries may miss genuinely relevant news about those entities that doesn't mention the user's core topics → Mitigation: use top 3 coreTopics as an OR group rather than AND, keeping decent recall. The scoring agent can still surface seismic events.
- **[Keyword matching is imprecise]** The post-fetch filter uses substring matching which can false-positive on partial matches (e.g., "AI" matching "WAIT") → Mitigation: coreTopics are typically multi-word phrases from the content universe generator, making false positives unlikely. Single-word topics would need word-boundary matching.
- **[Query count may increase]** Scoped queries are longer and more specific, potentially requiring more queries to cover the same entities → Mitigation: newsQueries deduplication by content hash handles this; the total query count is already capped per cycle.
