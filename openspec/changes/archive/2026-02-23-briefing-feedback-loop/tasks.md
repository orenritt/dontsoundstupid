## 1. Briefing Item Model

- [x] 1.1 Create `src/models/briefing.ts` with BriefingItem type (id, topic, category, source, summary, content)
- [x] 1.2 Create Briefing type (id, items, generatedAt, deliveredAt)

## 2. Interaction & Feedback Model

- [x] 2.1 Create `src/models/feedback.ts` with interaction types: DeepDiveRequest, TuneMoreFeedback, TuneLessFeedback
- [x] 2.2 Create FeedbackSignal union type and FeedbackHistory collection type
- [x] 2.3 Add Zod validation schemas for briefing and feedback types in `src/models/schema.ts`

## 3. Profile Integration

- [x] 3.1 Add FeedbackHistory and learned relevance adjustments to ContextLayer in `src/models/context.ts`
- [x] 3.2 Update context snapshot to include feedback history
- [x] 3.3 Update UserProfile and Zod schema to include feedback data
- [x] 3.4 Export new types from `src/models/index.ts`

## 4. Verify

- [x] 4.1 Run TypeScript compiler — all files compile clean
