## 1. Composer Types Model

- [ ] 1.1 Create `src/models/composer.ts` with: ComposerConfig (LLM provider, model, max tokens, temperature), BriefingPrompt (user context summary, scored signals, format preference, meeting context), ComposedBriefing (sections with title/content/source signal IDs, format used, model used, generated at), DeliveryAttempt (briefing ID, channel, status, attempted at, error), BriefingSchedule (user ID, next delivery at, timezone, last delivered at)
- [ ] 1.2 Add Zod schemas for composer types in `src/models/schema.ts`
- [ ] 1.3 Export new types from `src/models/index.ts`

## 2. Database Schema

- [ ] 2.1 Add briefing_deliveries table to `src/db/schema.sql`
- [ ] 2.2 Add briefing_schedules table to `src/db/schema.sql`

## 3. Verify

- [ ] 3.1 Run TypeScript compiler — all files compile clean
