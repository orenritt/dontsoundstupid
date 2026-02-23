## 1. UI State Types

- [ ] 1.1 Create `src/models/ui.ts` with: OnboardingStep (enum of all wizard steps), OnboardingWizardState (current step, completed steps, step data for each step), BriefingViewState (current briefing, expanded section IDs, feedback given), NavRoute (all frontend routes as a union type), UINotification (type: success/error/info, message, auto-dismiss), ThemePreference ("light" | "dark" | "system")
- [ ] 1.2 Add Zod schemas for all UI types in `src/models/schema.ts`
- [ ] 1.3 Export new types from `src/models/index.ts` (add before profile.js export)

## 2. Verify

- [ ] 2.1 Run TypeScript compiler — all files compile clean
