## Why

The system always produces exactly 5 briefing items, regardless of whether those items actually clear a bar of "you need to know this." The scoring agent picks the best available — but the best of a mediocre pool is still mediocre. The product isn't trying to pump news. It's trying to make sure that when something people are talking about, something new popping up, something that would make you look uninformed if you missed it — you know about it. Silence is better than noise. On days when nothing clears the bar, the right answer is to not send, not to scrape the bottom of the pool for filler.

Additionally, the scoring agent has no visibility into whether a topic is picking up steam internally — whether a term or entity that barely appeared last week is now showing up across multiple signals. External momentum (Google Trends) is already available, but there's no tool to detect acceleration within the user's own ingested signal pool. A topic slowly building across the signal pool is strong evidence of genuine emerging relevance, even if no single signal about it seems individually remarkable.

## What Changes

- Add an **interestingness threshold** to the scoring agent. Each selected signal must clear an absolute bar — not just be "the best available" but genuinely worth interrupting someone's day. The agent must be able to select fewer than 5 items (down to zero) if the candidate pool doesn't warrant a full briefing.
- Add a **signal pool momentum tool** to the scoring agent — a new tool that lets the agent query how frequently a topic, term, or entity has appeared in the user's ingested signals over recent time windows (e.g., last 7 days vs prior 7 days). This surfaces internal acceleration: things picking up steam within the signal pool before they necessarily trend publicly.
- Update the **briefing composer** to handle variable-length briefings (1-5 items, or none). When zero items pass the threshold, the system sends nothing (or a minimal "nothing to report" acknowledgment, consistent with existing zero-briefing day handling).
- Add the **interestingness criteria** to the scoring agent's system prompt — explicit, structured guidance on what clears the bar. Not a numeric score, but a qualitative gate: "Would a sharp colleague mention this unprompted? Is this actually news, or just content?"

## Capabilities

### New Capabilities
- `signal-pool-momentum`: A scoring agent tool that queries the signal store for frequency and acceleration data on topics/entities across recent time windows. Enables the agent to detect what's picking up steam in the user's ingested content before it trends publicly.

### Modified Capabilities
- `relevance-scoring`: Add interestingness threshold as a gate on the agent's selections. The agent must evaluate each candidate against an absolute bar of "worth sending" rather than just ranking relatively. Add the signal pool momentum tool to the agent's available tools. Allow the agent to return fewer than 5 selections (including zero).
- `briefing-composer`: Handle variable-length briefings (0-5 items). When zero items pass the threshold, skip composition or produce a minimal acknowledgment. Remove the hard requirement of exactly 5 items.
- `knowledge-graph-novelty`: Update zero-briefing-day handling to distinguish between "nothing novel" and "nothing interesting enough" — different messaging for each case.

## Impact

- **Scoring agent** (`scoring-agent.ts`): New system prompt section defining interestingness criteria. New `check_signal_momentum` tool registration. Selection output allows fewer than 5 items. Agent must include interestingness reasoning per selection.
- **Signal momentum module** (new: `signal-momentum.ts`): Queries signal store for term/entity frequency across time windows. Computes acceleration metrics (current period vs prior period). Returns structured data the agent can use to assess "picking up steam."
- **Pipeline** (`pipeline.ts`): Handle 0-item scoring results gracefully — skip composition and delivery, record as "nothing cleared threshold" rather than failure. Distinguish from actual pipeline failures.
- **Briefing composer** (`briefing-composer` spec / `pipeline.ts` composition block): Remove hard "exactly 5" constraint. Compose 1-N items where N ≤ 5.
- **Novelty spec** (`knowledge-graph-novelty`): Extend zero-day messaging to handle the "nothing interesting" case separately from "nothing novel."
- **Database**: No schema changes expected — the signal store already has timestamps and content needed for momentum queries. Briefings already store a variable-length items array.
