## Context

The signal store holds a shared pool of signals. Currently there's no record of why a signal was collected. Adding provenance creates a many-to-many relationship between signals and users, with metadata about the trigger reason. This is a join table pattern.

## Goals / Non-Goals

**Goals:**
- Track which user(s) triggered each signal's ingestion and why
- Support multiple provenance records per signal (shared pool, many users can trigger the same signal)
- Make provenance queryable for relevance boosting and cross-user discovery
- Keep provenance append-only (new triggers add records, never overwrite)

**Non-Goals:**
- Implementing the "similar users" matching algorithm (future)
- Changing the ingestion logic (provenance is recorded by ingestion, but ingestion changes are separate)
- User-facing provenance display

## Decisions

### Decision 1: Separate provenance table, not embedded in signal

Provenance is a many-to-many relationship (one signal, many users+reasons). A separate table with foreign keys is cleaner than embedding arrays in the signal record. It also makes querying by user efficient. Alternative: JSONB array on signal — rejected because it makes per-user queries expensive and updates non-atomic.

### Decision 2: Trigger reason as an enum

Use a fixed set of trigger reasons (followed-org, peer-org, impress-list, intelligence-goal, industry-scan, personal-graph) rather than free text. This makes aggregation and analysis possible. The specific profile element (e.g., which org, which person) is stored as a free text reference field.

### Decision 3: Append-only provenance

Provenance records are never updated or deleted. If a new user triggers the same signal, a new record is added. This preserves the full history of why signals exist in the store, which is important for the "similar users" feature and for understanding ingestion patterns.

## Risks / Trade-offs

- **Provenance table growth** — Many users × many signals = large join table. Mitigation: index on (user_id, signal_id), partition by date if needed.
