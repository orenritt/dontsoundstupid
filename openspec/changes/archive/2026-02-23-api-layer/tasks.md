## 1. API Types Model

- [ ] 1.1 Create `src/models/api.ts` with: ApiResponse<T> (success, data, error), PaginatedResponse<T> (extends with page, pageSize, total, hasMore), ApiError (code, message, details), all endpoint request/response types for Auth, Onboarding, Profile, Impress List, Briefings, Feedback, Calendar, Knowledge Graph, Pipeline, Delivery
- [ ] 1.2 Add Zod schemas for API types in `src/models/schema.ts`
- [ ] 1.3 Export new types from `src/models/index.ts`

## 2. Verify

- [ ] 2.1 Run TypeScript compiler — all files compile clean
