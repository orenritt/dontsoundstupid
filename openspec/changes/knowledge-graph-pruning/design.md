## Context

The knowledge graph is append-only. Entities enter from 5 insertion paths (`knowledge-seed.ts`, `knowledge-gap-scan.ts`, `impress-deep-dive.ts`, `briefing-entity-extraction.ts`, `feedback/not-novel/route.ts`) but are never removed. The AI-generated entries (industry scan, gap scan) frequently include entities that are too general ("Machine Learning", "Data Analytics") or tangential to the user's domain. These pollute novelty scoring — broad entities create false overlap with incoming signals, suppressing genuinely novel content.

The scoring agent (`scoring-agent.ts`) checks the full knowledge graph via `executeCheckKnowledgeGraph`, which either text-matches or embedding-similarity-matches against all user entities. A bloated graph with generic entities degrades the quality of novelty filtering.

## Goals / Non-Goals

**Goals:**
- Prune entities that are too general or not plausibly related to the user's specific domain
- Prevent pruned entities from being re-added by any insertion path
- Provide admin control to trigger pruning on demand
- Keep the cost low by using gpt-4o-mini for batch classification

**Non-Goals:**
- Changing the seeding prompts or reducing seeding breadth (seeding stays wide)
- Pruning profile-derived or rapid-fire entities (user-asserted knowledge is exempt)
- Real-time per-entity gating at insert time (batch is sufficient)
- Modifying the novelty scoring algorithm itself

## Decisions

### 1. Batch litmus test via gpt-4o-mini

Evaluate entities in batches (up to 50 at a time) against two criteria:
- **Not too general**: "Would a random professional in any industry also know this?" → prune
- **Plausibly related**: "Could this entity surface in a signal that would genuinely matter to someone in this user's specific role/industry?" → prune if no

The model receives the user's role, company, industry, and topics alongside the batch of entities. It returns a JSON array of keep/prune verdicts with one-sentence reasons.

**Why batch over per-entity**: Lower cost (one call per ~50 entities vs one per entity), better context (model sees the full set and can reason about relative specificity), and simpler implementation.

**Why gpt-4o-mini over embedding-based heuristics**: The "too general" judgment requires world knowledge about what's common vs. niche. A cosine-similarity threshold can't distinguish "HL7 FHIR" (specific, valuable) from "Data Analytics" (general, harmful) — both could have similar embedding distances from user topics.

### 2. Suppression list via `pruned_entities` table

A per-user table storing `(user_id, entity_name, entity_type, pruned_at, reason)` with a unique constraint on `(user_id, name, entity_type)`.

All entity insertion paths check this table before inserting. If a match exists, the insert is silently skipped. This prevents gap scans, briefing extraction, and deep-dives from re-introducing pruned entities.

**Why a separate table vs. a soft-delete flag on `knowledge_entities`**: The entity is genuinely removed — keeping it with a flag would still pollute embedding-based similarity searches in `executeCheckKnowledgeGraph` and require filter clauses everywhere. A separate suppression table is cleaner.

### 3. Source exemptions

Entities with `source` in `["profile-derived", "rapid-fire"]` are exempt from pruning. These represent knowledge the user explicitly confirmed. All other sources (`industry-scan`, `briefing-delivered`, `deep-dive`, `feedback-implicit`, `impress-deep-dive`, `calendar-deep-dive`) are prunable.

### 4. Execution triggers

- **Post-seeding**: `seedKnowledgeGraph()` calls `pruneKnowledgeGraph()` after inserting all entities
- **Periodic sweep**: the daily orchestrator or a scheduled job runs pruning for active users (weekly cadence)
- **Admin on-demand**: new API route `POST /api/admin/prune-knowledge-graph` accepts a `userId` and triggers immediately
- **Admin dashboard**: button on the user detail view that calls the admin route

### 5. Shared insertion guard

Extract a helper `isEntitySuppressed(userId, name, entityType)` that checks the suppression list. All 5 insertion paths call this before inserting. This is a lightweight DB lookup (indexed), not an LLM call — the LLM only runs during batch pruning.

## Risks / Trade-offs

- **False positive pruning** → An entity gets pruned that was actually relevant. Mitigation: the suppression list stores the reason, admin can review and manually un-suppress. The litmus test errs toward keeping (instructions say "when in doubt, keep").
- **Re-seeding after un-suppress** → If admin removes an entity from suppression, it won't automatically re-appear in the knowledge graph. Mitigation: admin can re-trigger seeding or manually add the entity. Acceptable for a rare operation.
- **Batch size vs. context quality** → Larger batches give the model more context but risk attention degradation. 50 entities is a reasonable ceiling for gpt-4o-mini's context handling.
- **Cost** → At ~50 entities per call, a user with 500 entities costs ~10 API calls to gpt-4o-mini per full sweep. Negligible.
