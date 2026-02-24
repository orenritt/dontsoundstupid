## Why

The knowledge graph is append-only — entities enter from seeding, industry scans, gap scans, deep-dives, and post-briefing extraction, but nothing ever leaves. Over time this accumulates entities that are too general ("Machine Learning", "Cloud Computing") or not plausibly related to the user's actual domain. These low-quality entities suppress novelty scores on signals that genuinely matter, because any signal that mentions a broad concept gets marked as "already known." The graph needs a quality gate.

## What Changes

- A cheap-model (gpt-4o-mini) batch litmus test that every non-profile-derived entity must pass: not too general, and plausibly related to the user's specific role/domain
- A suppression list of pruned entity names per user, preventing re-addition by future scans, seeding, or briefing extraction
- Batch pruning job that runs post-seeding and as a periodic sweep
- Admin API endpoint and dashboard button to trigger pruning on demand for any user
- Profile-derived entities (source: `profile-derived`, `rapid-fire`) are exempt from pruning

## Capabilities

### New Capabilities

### Modified Capabilities
- `knowledge-graph-novelty`: Add entity pruning via litmus test, suppression list for pruned entities, batch pruning job, and admin-triggered pruning

## Impact

- New `pruned_entities` DB table for the suppression list
- New `pruneKnowledgeGraph(userId)` function in `src/lib/`
- Modification to all entity-insertion paths to check suppression list before insert
- New admin API route for on-demand pruning
- Admin dashboard addition: prune button per user
- Additional gpt-4o-mini usage (batch classification, low cost)
