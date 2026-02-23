## Context

The system scores signals for relevance but has no mechanism to distinguish "relevant and new" from "relevant but obvious." For a product called "Don't Sound Stupid," surfacing things the user already knows actively undermines trust. The knowledge graph + novelty gate ensures every briefing item earns its place.

## Goals / Non-Goals

**Goals:**
- Per-user knowledge graph with entity-level granularity
- Aggressive T-0 seeding (assume they know everything a competent peer would)
- Novelty as a multiplicative gate (not just another weighted factor)
- Continuous graph growth from briefing delivery and feedback
- Graceful handling of zero-briefing days with interest expansion prompts

**Non-Goals:**
- Knowledge graph visualization UI (future)
- Cross-user knowledge sharing ("users like you also know...")
- Forgetting / knowledge decay (entities don't lose confidence over time for MVP)
- Real-time novelty scoring (batch during daily pipeline is sufficient)

## Decisions

### Decision 1: Novelty is multiplicative, not additive

Unlike relevance factors which are weighted and summed, novelty acts as a gate. `finalScore = relevanceScore * noveltyScore`. This means a signal with perfect relevance but zero novelty gets zero final score. This enforces the "better to say nothing" stance — we'd rather miss something than bore the user.

### Decision 2: Aggressive T-0 seeding with AI scan

We seed the knowledge graph with two phases: (1) deterministic extraction from profile data (confidence 1.0), and (2) AI-powered "what would a competent [role] in [industry] know?" scan (confidence 0.8). This front-loads the graph so first briefings are already filtered. The 0.8 confidence on AI-scanned entities means a very strong signal about something "obvious" could still break through if novelty factors from other checks are high enough.

### Decision 3: Embeddings for semantic matching

Knowledge entities have vector embeddings (same model as signals). Novelty is computed by comparing signal embeddings against the user's knowledge entity embeddings via cosine similarity. This catches semantic equivalents — "Series B funding round" and "growth-stage capital raise" should match even without keyword overlap.

### Decision 4: Exposure records as a separate table

Rather than embedding exposure history into the knowledge graph, exposure records are a separate table that links users, signals, briefings, and entities. This allows efficient querying ("what signals has this user seen about topic X?") without polluting the entity graph.

### Decision 5: Zero-briefing days are opportunities

When novelty filtering results in nothing to send, we don't just go silent. We send a minimal acknowledgment plus an LLM-generated prompt that suggests interest graph expansions based on what was filtered out. This turns a "no content" day into a profile refinement opportunity.

## Risks / Trade-offs

- **Over-filtering early on** — the aggressive T-0 seeding might filter too much in the first few days. Mitigation: AI-scanned entities get 0.8 confidence (not 1.0), so strong novel signals can still break through.
- **Entity extraction quality** — extracting entities from signals and briefings requires NLP/LLM processing. Mitigation: use the same LLM pipeline we already have for briefing composition.
- **Knowledge graph growth** — the graph grows monotonically (entities are never removed). Over months, this could make the novelty bar very high. Mitigation: acceptable for MVP; future work could add knowledge decay or staleness.
