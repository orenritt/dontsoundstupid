## Context

The scoring agent currently selects the "top N" signals from a candidate pool. Even when the prompt says "be ruthless" and "it's better to select fewer," the hard `targetSelections: 5` config and the pipeline's treatment of zero selections as a failure mean the system always produces 5 items. The architectural path from scoring → composition → delivery assumes a fixed-size output. There is no mechanism for the agent to say "nothing today" without the pipeline treating it as an error.

Separately, the agent has external momentum tools (Google Trends) but no visibility into what's accelerating inside the user's own signal pool. A term mentioned in 1 signal last week and 7 signals this week is picking up steam — that's a strong interestingness signal that the agent can't currently see.

Current flow: `candidates → agent picks best N → always compose N items → always deliver`

Target flow: `candidates → agent evaluates each against absolute bar + momentum data → compose 0-N items → deliver or skip`

## Goals / Non-Goals

**Goals:**
- The scoring agent can return 0 to N selections based on an absolute interestingness bar, not just relative ranking
- The pipeline treats 0 selections as a legitimate outcome ("quiet day"), not a failure
- The agent has a tool to query how frequently topics/entities appear across the signal pool over recent time windows, revealing internal acceleration
- The briefing composer handles variable-length output (1-5 items, or none)
- Zero-item days produce either silence or a minimal "nothing worth your time today" message

**Non-Goals:**
- A numeric interestingness score visible to users or stored as metadata (the threshold is qualitative, applied by the agent)
- Changing the candidate generation pipeline (signals still flow in the same way; the gate is applied during selection)
- Building a standalone momentum tracking service or dashboard (the tool queries existing signal store data on demand)
- Changing the number of tool rounds, the agent's model, or the existing tool set (we're adding one tool and modifying the prompt, not restructuring the agent loop)
- Persisting momentum data — it's computed on-the-fly from the signal store

## Decisions

### Decision 1: Interestingness as Prompt-Level Guidance, Not a Separate Gate

The interestingness threshold is implemented as structured criteria in the scoring agent's system prompt, not as a separate pre-filter or post-filter step. The agent already evaluates every candidate holistically — adding a separate "interestingness check" would either duplicate work (another LLM call) or be too brittle (rule-based).

**Approach:** Add an `INTERESTINGNESS THRESHOLD` section to `buildSystemPrompt` with explicit, structured criteria. The agent must justify why each selection clears the bar, and is explicitly told that returning fewer than `targetSelections` (including zero) is not just allowed but preferred when the pool is weak.

**Criteria structure (what clears the bar):**
- **The "sharp colleague" test**: Would someone knowledgeable in this person's exact niche mention this unprompted at a coffee? If no, it doesn't clear the bar.
- **Concreteness**: There must be a specific event, number, entity, or development — not a trend piece, think piece, or rehash.
- **Recency**: The development must be genuinely new — not a repackaging of something from last week.
- **Consequence**: It must change what the user would say, do, or think about something. If it doesn't change anything, it's noise.
- **Momentum boost**: If the `check_signal_momentum` tool shows a topic is accelerating (appearing in significantly more signals this week than last), that's evidence something real is happening and lowers the bar slightly for that topic — the pool itself is telling you something is emerging.

**Why not a numeric threshold?** A number (e.g., "only include signals above 0.7") would be arbitrary and brittle. The agent already has the context to make this judgment — it knows the user, the signals, the meetings, the feedback history. The criteria give it a framework; the number would add false precision.

**Why not a post-filter after the agent selects?** The agent is best positioned to make this call during selection, when it's weighing all candidates against each other and against the user context. A post-filter would need a second LLM call with the same context, or a reductive heuristic.

### Decision 2: Signal Pool Momentum as an On-Demand Query Tool

The momentum tool (`check_signal_momentum`) queries the signal store at scoring time to compute frequency/acceleration metrics for topics or entities. It does not maintain a separate momentum index or pre-compute trends.

**Tool interface:**

```typescript
interface SignalMomentumArgs {
  queries: string[];       // Topics/entities to check (up to 5)
  windowDays?: number;     // Size of each comparison window (default: 7)
}

interface SignalMomentumResult {
  query: string;
  currentWindow: { count: number; start: string; end: string };
  priorWindow: { count: number; start: string; end: string };
  acceleration: "surging" | "rising" | "stable" | "declining" | "new";
  accelerationRatio: number;  // currentCount / priorCount (Infinity if prior was 0)
  topSignals: { title: string; ingestedAt: string; layer: string }[];  // Most recent signals matching
}
```

**How it works:**
1. For each query term, search signal titles + summaries + content for matches in two windows: the current window (last N days) and the prior window (N to 2N days ago).
2. Count matches in each window.
3. Compute acceleration ratio (current/prior). Classify: `surging` (3x+), `rising` (1.5x-3x), `stable` (0.67x-1.5x), `declining` (<0.67x), `new` (prior was 0, current > 0).
4. Return the top 3 most recent matching signals for context.

**Why on-demand, not pre-computed?** The signal pool is relatively small per user (hundreds of signals over a few weeks). Text search against titles/summaries for 3-5 query terms is fast enough at scoring time. Pre-computing would add a scheduled job, a storage table, and staleness concerns — all for minimal latency benefit.

**Why text search, not embeddings?** Momentum is about the same term or entity appearing repeatedly. Embedding similarity is too fuzzy — "parametric insurance" and "insurance technology" would score similar, but we want to detect the exact phrase gaining traction. Text matching (case-insensitive substring) is the right tool here.

**Scoping:** The tool queries the shared signal pool, not just signals with provenance for this user. This is intentional — if "parametric insurance for coral reefs" is appearing more often across the entire pool, that's meaningful momentum even if not every signal was ingested specifically for this user.

### Decision 3: Pipeline Handles Zero Selections as a Legitimate Outcome

Currently, `runPipeline` returns `null` and sets status to "failed" when the scoring agent returns no selections. This conflates "the pipeline broke" with "nothing was interesting today."

**Change:** Add a new pipeline status `"skipped-nothing-interesting"` and a new return type that distinguishes between failure and intentional skip.

**Pipeline flow for zero selections:**
1. Scoring agent returns `{ selections: [] }` — this is valid, not an error.
2. Pipeline skips composition and delivery.
3. Pipeline records `status: "skipped-nothing-interesting"` with metadata: `{ candidateCount, scoringReasoning }`.
4. Pipeline returns a result object indicating the skip, not `null`.
5. The "nothing cleared threshold" case is distinct from "nothing novel" (knowledge-graph-novelty zero-day handling). The novelty spec's zero-day path fires when *all signals fail novelty*. The interestingness skip fires when *no signal is worth sending regardless of novelty*. In practice, the agent considers both — but the pipeline status distinguishes them.

**Why not send a "nothing today" message?** For now, silence. The spec says "MUST NOT send an empty briefing — better to say nothing than to waste their time." A minimal acknowledgment could be added later, but the default is no send. The user opted into a daily briefing of things worth knowing — no things worth knowing means no interruption.

### Decision 4: Variable-Length Briefing Composition

The composer currently expects exactly 5 items. This changes to 1-5 items, with the count determined by how many signals cleared the interestingness bar.

**Changes:**
- System prompt updated: "You will receive 1 to 5 signals" instead of "5 signals."
- The briefing format remains identical per item — reason pre-title, 1-2 sentence body, source link. Just fewer of them on lean days.
- Channel formatting (email, Slack, SMS, WhatsApp) already uses dynamic iteration over items, so no structural changes needed — just removal of any "exactly 5" assertions.

**Why not pad to 5 with lower-quality items?** The entire point. A 2-item briefing of genuinely important things is better than a 5-item briefing padded with filler. The user's trust depends on every item being worth their 10 seconds.

### Decision 5: Agent Instruction Changes — Explicit "You May Select Zero"

The current system prompt already says "it is better to select fewer than N signals than to pad the briefing with filler." But it also says "select the top N" and the config has `targetSelections: 5`. These create conflicting incentives.

**Changes to `buildSystemPrompt`:**
1. Replace "select the top N" with "select up to N signals that clear the interestingness bar."
2. Add explicit language: "If no candidates clear the bar, submit an empty selections array. An empty briefing is the correct output when nothing is genuinely interesting."
3. Add the interestingness criteria (Decision 1) as a named section.
4. Add the `check_signal_momentum` tool to the tool definitions.
5. Integrate momentum into the selection criteria: "If `check_signal_momentum` shows a topic is surging or rising in the signal pool, that's evidence something real is building — this lowers the bar slightly for signals about that topic. Conversely, if a topic is stable or declining in the pool, it needs to clear a higher bar on its own merits."

**Tool definition for `check_signal_momentum`:**

```
14. check_signal_momentum
    Checks how frequently a topic or entity has been appearing in the signal pool
    over recent time windows. Use this to detect what's picking up steam — a topic
    appearing in 7 signals this week vs. 1 signal last week is building momentum,
    even if no single signal about it is individually remarkable. Combine with
    query_google_trends to get both internal (signal pool) and external (public
    search interest) momentum.
    Args: { "queries": ["<term1>", "<term2>", ...], "windowDays": <optional: days per window, default 7> }
    Returns: per-query frequency data for current vs. prior window, acceleration
    classification (surging/rising/stable/declining/new), and recent matching signals.
```

### Decision 6: submit_selections Accepts Empty Array

Currently, `parseSelections` returns `null` if the selections array is empty, and the agent loop treats that as a malformed submission. This must change.

**Change:** `parseSelections` returns an empty array `[]` when given `{ "selections": [] }`. The agent loop treats this as a valid submission. The pipeline receives a result with `selections: []` and follows the Decision 3 path.

**Guard:** The agent must still call `submit_selections` exactly once. It cannot simply stop responding — it must explicitly submit, even if the array is empty. This keeps the audit trail clean.

## Risks / Trade-offs

**Risk: Agent over-filters and sends too few briefings.** If the interestingness bar is set too high in the prompt, users stop getting value.
→ Mitigation: Monitor the rate of "skipped-nothing-interesting" outcomes per user. If a user gets more than 3 skips in a 7-day window, the prompt criteria may be too aggressive for their signal pool. This is a tuning knob in the prompt, not a code change. The momentum tool also helps — rising topics create evidence that lowers the bar.

**Risk: Momentum tool returns noisy results for common terms.** A generic term like "AI" will match hundreds of signals and always show high counts, providing no useful momentum signal.
→ Mitigation: The tool is most useful with specific terms (company names, niche topics, technical terms). The agent is instructed to query specific terms, not generic ones. Additionally, the acceleration *ratio* (current vs prior) is what matters, not absolute count — a term that always has 50 matches per week is "stable," not "surging."

**Risk: Text-based momentum matching misses paraphrases.** "Parametric insurance" and "parameter-based coverage" are the same concept but won't match via substring.
→ Mitigation: Acceptable trade-off. Momentum detection should be precise (the same term is appearing more often), not fuzzy (related concepts are appearing). The agent can query multiple phrasings if it suspects paraphrasing: `queries: ["parametric insurance", "parameter-based coverage", "parametric products"]`.

**Risk: Pipeline status change breaks monitoring or API expectations.** Code that checks for "failed" status may not handle "skipped-nothing-interesting."
→ Mitigation: The new status is additive — existing "failed" handling is unchanged. "Skipped" is a new success-path status. API consumers need to be aware of it, but it doesn't break existing failure detection.

**Risk: Users perceive silence as a bug.** If they expect a daily briefing and get nothing, they may think the system is broken.
→ Mitigation: This is a product/UX decision more than a technical one. The initial implementation uses silence (no message). If user confusion becomes an issue, a minimal "Nothing worth your time today — we're still watching" message can be added without architectural changes. The pipeline already records why it skipped, so the decision is traceable.
