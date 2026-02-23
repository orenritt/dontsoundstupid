## Context

Users know where their blind spots are. Asking them directly is more reliable than inferring expertise from profile data alone. A PM who says "I'm novice in regulatory" should get regulatory news that an expert PM would already know.

## Goals / Non-Goals

**Goals:**
- Per-category expertise self-rating during onboarding
- Direct impact on relevance boost and novelty thresholds
- Influence T-0 knowledge graph seeding depth
- Modifiable after onboarding

**Non-Goals:**
- Automatically inferring expertise from behavior (future enhancement)
- Gamification of expertise levels
- Peer comparison ("you're more expert than 80% of PMs")

## Decisions

### Decision 1: Four-level expertise scale

Novice / Developing / Proficient / Expert. Simpler is better for onboarding — users shouldn't agonize over this. Four levels provides enough granularity to meaningfully adjust scoring without being overwhelming.

### Decision 2: Expertise affects both relevance AND novelty

This is a two-lever system: novice categories get both higher relevance weight (surface more of it) AND lower novelty thresholds (don't filter it as aggressively). Expert categories keep standard relevance but raise the novelty bar dramatically. The asymmetry is intentional — for expert areas, we still want relevant signals, we just need them to be genuinely new.

### Decision 3: Fixed multiplier mapping

Rather than letting the scoring engine learn the right multipliers, we start with fixed values derived from the expertise level. This is predictable and explainable. Future work could let feedback loop adjust these per-user.

## Risks / Trade-offs

- **Self-assessment accuracy** — people are bad at knowing what they don't know (Dunning-Kruger). Mitigation: the feedback loop corrects over time; "not novel" feedback in expert areas proves they were right, "tell me more" in novice areas confirms they need depth.
- **Onboarding friction** — one more step. Mitigation: it's fast (just selecting levels from a list of already-selected categories) and the value prop is clear ("this helps me know what to teach you vs. what you already know").
