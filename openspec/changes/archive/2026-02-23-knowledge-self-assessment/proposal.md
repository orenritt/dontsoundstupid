## Why

The system already asks users about their intelligence goals ("what does not sounding stupid mean for you?") but doesn't ask them to rate their own expertise level per area. Knowing "I'm weak on regulatory" vs. "I'm an expert in competitive intelligence" is critical for calibrating both relevance scoring and novelty thresholds. Weak areas should have boosted relevance and lowered novelty bars (surface more, even if somewhat known). Expert areas should have high novelty bars (only surface genuinely new developments — don't bore them with basics).

## What Changes

- Add a `SelfAssessment` type: per-category expertise level (novice, developing, proficient, expert)
- Add self-assessment to the ContextLayer 
- Add a new onboarding step after intelligence goals where users rate their expertise per selected category
- Add per-category scoring overrides: category-specific relevance boost and novelty threshold adjustments derived from self-assessment
- Pre-populate knowledge graph more aggressively for "expert" categories during T-0 seeding

## Capabilities

### New Capabilities
- `knowledge-self-assessment`: User self-rates expertise per intelligence goal category, affecting relevance boost and novelty thresholds

## Impact

- Modified: ContextLayer, ContextSnapshot (add selfAssessments)
- Modified: onboarding steps (add self-assessment step)
- Modified: ScoringConfig (add per-category overrides)
- New type: SelfAssessment, ExpertiseLevel, CategoryScoringOverride
