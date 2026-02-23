## 1. Model Changes

- [ ] 1.1 Add ExpertiseLevel, SelfAssessment, CategoryScoringOverride types to `src/models/context.ts`
- [ ] 1.2 Add selfAssessments to ContextLayer and ContextSnapshot
- [ ] 1.3 Add per-category scoring overrides to ScoringConfig in `src/models/relevance.ts`
- [ ] 1.4 Update Zod schemas in `src/models/schema.ts`

## 2. Onboarding Changes

- [ ] 2.1 Add "self-assessment" step to OnboardingStepId and input types in `src/onboarding/steps.ts`
- [ ] 2.2 Add step script to `src/onboarding/script.ts`
- [ ] 2.3 Update step order in `src/onboarding/flow.ts`

## 3. Verify

- [ ] 3.1 Run TypeScript compiler — all files compile clean
