## 1. Impress Contact Model

- [x] 1.1 Create ImpressContact type wrapping EnrichedPerson with: source, tier (core/temporary), status (active/inactive), linkedMeetingId, activeFrom/activeUntil, timestamps
- [x] 1.2 Create ImpressList type with core and temporary arrays
- [x] 1.3 Move impress list from IdentityLayer to a top-level field on UserProfile

## 2. Schema Updates

- [x] 2.1 Add Zod schemas for ImpressContact and ImpressList
- [x] 2.2 Update UserProfile Zod schema — impress list as top-level field, remove from identity layer
- [x] 2.3 Update IdentityLayer to remove impressList

## 3. Verify

- [x] 3.1 Run TypeScript compiler — all files compile clean
