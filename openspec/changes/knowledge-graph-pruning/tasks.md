## 1. Database & Schema

- [x] 1.1 Add `pruned_entities` table to `schema.sql` with columns: `id`, `user_id`, `name`, `entity_type`, `reason`, `pruned_at`; unique constraint on `(user_id, name, entity_type)`
- [x] 1.2 Add `prunedEntities` Drizzle table definition to `src/lib/schema.ts` and export from `src/models/knowledge-graph.ts`

## 2. Core Pruning Logic

- [x] 2.1 Create `src/lib/knowledge-prune.ts` with `pruneKnowledgeGraph(userId)` — loads non-exempt entities, batches them (50 per call), calls gpt-4o-mini litmus test, returns prune/keep verdicts
- [x] 2.2 Implement the gpt-4o-mini prompt: accepts user context (role, company, topics) + entity batch, returns JSON array of `{ name, keep, reason }` verdicts
- [x] 2.3 Implement entity deletion — for pruned entities: delete from `knowledge_entities`, cascade-delete related `knowledge_edges`, insert into `pruned_entities`
- [x] 2.4 Add `isEntitySuppressed(userId, name, entityType)` helper that checks the `pruned_entities` table

## 3. Insertion Guard

- [x] 3.1 Add suppression check to `src/lib/knowledge-seed.ts` — call `isEntitySuppressed` before each insert
- [x] 3.2 Add suppression check to `src/lib/knowledge-gap-scan.ts` — call `isEntitySuppressed` before each insert
- [x] 3.3 Add suppression check to `src/lib/impress-deep-dive.ts` — call `isEntitySuppressed` in `ensureConceptEntity` / `ensurePersonEntity` paths
- [x] 3.4 Add suppression check to `src/lib/briefing-entity-extraction.ts` — call `isEntitySuppressed` before each insert
- [x] 3.5 Add suppression check to `src/app/api/feedback/not-novel/route.ts` — call `isEntitySuppressed` before insert

## 4. Pruning Triggers

- [x] 4.1 Call `pruneKnowledgeGraph(userId)` at the end of `seedKnowledgeGraph()` in `knowledge-seed.ts`
- [x] 4.2 Add weekly pruning sweep to the daily orchestrator / scheduled jobs — iterate active users and call `pruneKnowledgeGraph`

## 5. Admin API & Dashboard

- [x] 5.1 Create `POST /api/admin/prune-knowledge-graph` route — accepts `{ userId }`, runs pruning, returns `{ pruned: number, kept: number }`
- [x] 5.2 Add admin dashboard button on user detail view to trigger pruning via the new route
- [x] 5.3 Expose suppression list in admin data explorer — allow viewing and deleting suppression entries per user

## 6. Tests

- [x] 6.1 Unit tests for `pruneKnowledgeGraph`: verify exempt sources are skipped, pruned entities are deleted + suppressed, edges are cleaned up
- [x] 6.2 Unit tests for `isEntitySuppressed`: verify matching and non-matching lookups
- [x] 6.3 Integration test: seed → prune → verify suppressed entity is not re-added by gap scan
- [x] 6.4 E2E mock for admin prune endpoint
