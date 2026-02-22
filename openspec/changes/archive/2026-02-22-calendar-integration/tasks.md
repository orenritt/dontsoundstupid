## 1. Calendar Data Model

- [x] 1.1 Create `src/models/calendar.ts` with types: CalendarProvider (discriminated union for Google/Outlook), CalendarConnection, Meeting, MeetingAttendee, MeetingIntelligence
- [x] 1.2 Add Zod validation schemas for calendar types in `src/models/schema.ts`
- [x] 1.3 Update `UserProfile` in `src/models/profile.ts` to include optional calendar connection
- [x] 1.4 Export new types from `src/models/index.ts`

## 2. Onboarding Flow Update

- [x] 2.1 Add calendar connection step type to `src/onboarding/steps.ts`
- [x] 2.2 Add optional calendar step to conversation script in `src/onboarding/script.ts`
- [x] 2.3 Update step ordering in `src/onboarding/flow.ts` — calendar step after peer review, skippable

## 3. Verify

- [x] 3.1 Run TypeScript compiler — all files compile clean
- [x] 3.2 Ensure calendar schema covers all spec requirements (connection, meetings, attendees, intelligence)
- [x] 3.3 Ensure onboarding flow correctly handles skip/connect paths
