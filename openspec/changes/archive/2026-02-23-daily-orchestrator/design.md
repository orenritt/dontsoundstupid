## Context

The pipeline components exist individually but need an orchestrator to run them in sequence for each user daily. The orchestrator handles scheduling, execution order, error recovery, and audit logging.

## Goals / Non-Goals

**Goals:**
- Single daily pipeline run per user, timed to their delivery preference
- Shared ingestion across users in the same time window
- Stage-level tracking for observability
- Graceful degradation (partial ingestion failures don't block briefing)
- T-0 seeding as a special one-time pipeline

**Non-Goals:**
- Real-time / streaming pipeline (batch daily is sufficient for MVP)
- Multi-region scheduling (single timezone-aware scheduler)
- Pipeline DAG visualization UI

## Decisions

### Decision 1: Ingestion is shared, scoring/composition is per-user

Ingestion layers poll external sources once per cycle and write to the shared signal store. Scoring, novelty filtering, and composition run per-user against the shared pool. This avoids redundant API calls and scraping.

### Decision 2: Pipeline stages are sequential per-user

For each user: score -> novelty filter -> compose -> deliver. No parallelism within a single user's pipeline. But multiple users can run in parallel.

### Decision 3: Stage-level error isolation

Each pipeline stage is independently trackable. An ingestion layer failure doesn't prevent scoring of already-ingested signals. A composition failure doesn't lose the scored signals — they can be recomposed on retry.

### Decision 4: Cron-style scheduling with timezone awareness

Users set a preferred time + timezone. The scheduler converts to UTC and batches users into time windows. Ingestion runs at the start of each window, then per-user pipelines fan out.

## Risks / Trade-offs

- **Pipeline duration variance** — if ingestion takes longer some days, briefings may be late. Mitigation: schedule pipeline start well before delivery time; track execution duration to auto-adjust.
- **Shared pool timing** — a user scheduled for 7am might get fewer signals than one at 9am (more ingestion has completed). Mitigation: acceptable for MVP; all users get the same daily cycle, just different delivery windows.
