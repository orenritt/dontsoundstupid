## Context

Briefing items currently show a `reasonLabel` (e.g., "People are talking", "Because you're meeting Sarah Chen at 2pm") but nothing that explains *why this item is relevant to the user specifically*. The scoring agent already knows the answer — it has full reasoning and tool call logs — but this data is discarded after selection. The proposal asks us to surface proactive contextual attribution: short, natural-language explanations woven into each briefing item.

Current data flow:
1. Scoring agent selects signals → produces `SignalSelection` with `reason`, `reasonLabel`, `confidence`, `noveltyAssessment`
2. Pipeline maps selections to signals and passes them to the composition LLM
3. Composition LLM writes briefing items with `reasonLabel` as a pre-title

The `reasonLabel` is already doing light attribution ("Because you're meeting Sarah Chen"). What's missing is richer context like "Sarah's company just raised a Series B" or "You flagged this topic as a knowledge gap."

## Goals / Non-Goals

**Goals:**
- Surface proactive contextual attribution in each briefing item so users understand why it was included
- Derive attribution from data already flowing through the pipeline (agent reasoning, tool results, provenance)
- Keep attribution natural and concise — a parenthetical or short clause, not a paragraph

**Non-Goals:**
- Changing the scoring agent's selection logic or criteria
- Adding new tools to the scoring agent
- Supporting user-configurable attribution verbosity (concise/standard/detailed format modes exist in the spec but the current implementation only has one format — we'll add attribution to what exists now)
- Exposing numeric scores or confidence values to the user

## Decisions

### 1. Attribution source: agent's `noveltyAssessment` + new `attribution` field

The scoring agent already produces a `noveltyAssessment` per selection explaining why the signal is novel. We'll add a parallel `attribution` field to `SignalSelection` that captures the "why you" explanation. The agent will populate this during `submit_selections`.

**Why not derive attribution post-hoc from tool logs?** The agent has the full context during selection — it knows which tools it called, what the results were, and why it picked each signal. Asking a separate LLM to reconstruct this from logs is wasteful and less accurate.

**Why not reuse `reasonLabel`?** It's too short and formulaic. "People are talking" doesn't tell you *why you specifically should care*. Attribution needs to reference the user's profile elements (initiatives, concerns, impress list, meetings, knowledge gaps).

### 2. Composition LLM receives attribution and weaves it in

The composition prompt will receive the `attribution` field alongside `reason`/`reasonLabel` and be instructed to incorporate it naturally into the briefing item body or as a trailing clause. The LLM decides placement — we don't want mechanical "Why: ..." labels.

### 3. Frontend shows attribution inline

Attribution appears as part of the briefing item text — the composition LLM bakes it in. No separate UI element needed. The `reasonLabel` pre-title stays as-is (it serves as a category label), and the attribution adds specificity within the body.

## Risks / Trade-offs

- **Token cost**: Adding `attribution` to the agent's `submit_selections` call slightly increases agent output tokens. Minimal impact since the agent is already producing per-signal reasoning.
- **Attribution quality**: The agent might produce generic attributions ("relevant to your role"). Mitigated by explicit prompt instructions to reference specific profile elements.
- **Composition fidelity**: The composition LLM might drop or mangle attribution. Mitigated by making attribution a required part of the composition input and output schema.
