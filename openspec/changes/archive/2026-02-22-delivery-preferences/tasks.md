## 1. Delivery Preferences Schema

- [x] 1.1 Create `src/models/delivery.ts` with discriminated union types for delivery channels (email, Slack, SMS, WhatsApp) and preferences (time, timezone, format)
- [x] 1.2 Add Zod validation schemas for delivery preferences in `src/models/schema.ts`
- [x] 1.3 Update `UserProfile` in `src/models/profile.ts` to include delivery preferences
- [x] 1.4 Export new types from `src/models/index.ts`

## 2. Onboarding Flow Update

- [x] 2.1 Add delivery preference step types to `src/onboarding/steps.ts`
- [x] 2.2 Add step 5 (delivery preferences) to the conversation script in `src/onboarding/script.ts`
- [x] 2.3 Update step ordering in `src/onboarding/flow.ts` to include the new step between peer review and completion

## 3. Verify

- [x] 3.1 Run TypeScript compiler — all files compile clean
- [x] 3.2 Ensure delivery preferences schema covers all spec requirements (channel, time, timezone, format)
