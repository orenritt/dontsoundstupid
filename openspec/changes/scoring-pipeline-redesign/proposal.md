## Why

The current scoring pipeline dumps up to 200 raw signals into a single LLM context, pays for ~195 signals worth of tokens that get ignored, and relies entirely on prompt-based heuristics ("sharp colleague test") that produce inconsistent results across runs. Tool calls are sequential (30-60s per scoring run), there's no learning loop from user feedback, and composition happens in a separate LLM call that lacks the agent's reasoning context. The system works but is expensive, slow, and doesn't get smarter over time.

## What Changes

### 1. Programmatic Pre-Scoring
Add a lightweight numerical pre-filter before the LLM agent. Score each signal on: recency decay, entity overlap with user profile, source authority, content universe match strength, dedup similarity. Rank and take the top 30 candidates instead of passing all 200.

### 2. Thematic Clustering
Embed the top 30 candidates and cluster them by theme. Present clusters to the scoring agent instead of individual signals — "here are 4 signals about X, 3 about Y, 2 about Z." This reduces context size further and helps the agent spot compound narratives naturally.

### 3. Tighter Agent Pool
The scoring agent now evaluates 30 pre-ranked candidates in clusters instead of 200 flat signals. Fewer tool rounds needed. Reduce `maxToolRounds` from 10 to 6. Reduce `candidatePoolSize` from 200 to 30.

### 4. Preference Model
Build a topic/source affinity model updated from user feedback (thumbs up/down, deep dives, "knew this already"). Simple weighted scores per topic and per source, decayed over time. Feed these as structured numerical data to the scoring agent alongside the candidate pool — not as raw feedback history the agent has to interpret.

### 5. Unified Scoring + Composition
Merge the scoring and composition into a single agent call. The agent selects signals AND writes the briefing items in one pass, with full access to its own reasoning chain. Eliminates the second LLM call and produces more coherent attribution.

## Capabilities

### New Capabilities

- `pre-scoring`: Programmatic signal ranking before LLM evaluation — recency, entity overlap, source authority, dedup
- `signal-clustering`: Embedding-based thematic clustering of pre-scored candidates
- `preference-model`: Per-user topic and source affinity scores updated from feedback signals

### Modified Capabilities

- `relevance-scoring`: Agent evaluates clustered, pre-ranked candidates (30 instead of 200); receives preference model scores; unified scoring + composition in one pass
- `briefing-composer`: Merged into the scoring agent's output — no longer a separate LLM call

## Impact

- `src/lib/pipeline.ts` — new pre-scoring and clustering stages between ingestion and agent scoring; remove separate composition call
- `src/lib/scoring-agent.ts` — reduced candidate pool, cluster-aware prompt, preference scores in context, composition output
- New files: `src/lib/pre-scoring.ts`, `src/lib/signal-clustering.ts`, `src/lib/preference-model.ts`
- Schema changes: new `user_preferences` table for affinity scores
- Embedding dependency: need an embedding model (OpenAI `text-embedding-3-small` or similar) for clustering
- Expected cost reduction: ~60-70% fewer prompt tokens per scoring run
- Expected latency reduction: ~40% faster (fewer candidates, fewer tool rounds, one LLM call instead of two)
