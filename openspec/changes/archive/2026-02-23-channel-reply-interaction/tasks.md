## 1. Channel Reply Types Model

- [x] 1.1 Create `src/models/channel-reply.ts` with: `ReplyIntent` type union (`deep-dive` | `tune-more` | `tune-less` | `already-knew` | `follow-up` | `unrecognized`), `InboundReply` (userId, messageText, channelType, threadRef, receivedAt), `IntentClassification` (intent, itemNumber 1-5 | null, confidence 0-1, freeText), `ReplySession` (userId, briefingId, briefingItems, channelType, conversationHistory, createdAt, expiresAt), `ReplyResponse` (channelType, responseText, itemRef | null, responseType)
- [x] 1.2 Add Zod schemas for channel reply types in `src/models/schema.ts`: inboundReplySchema, intentClassificationSchema, replySessionSchema, replyResponseSchema
- [x] 1.3 Export new types from `src/models/index.ts`

## 2. Database Schema

- [x] 2.1 Add `reply_sessions` table to `src/db/schema.sql`: id, user_id, briefing_id, channel, briefing_items (JSONB), conversation_history (JSONB), created_at, expires_at; with index on user_id and expires_at
- [x] 2.2 Add `inbound_replies` table to `src/db/schema.sql`: id, user_id, session_id (FK reply_sessions), channel, raw_message, classified_intent, resolved_item_number, confidence, processed_at; with indexes on user_id, session_id, and processed_at

## 3. Briefing Composer Item Numbering

- [x] 3.1 Add `itemNumber` field (1-5) to `BriefingSection` interface in `src/models/composer.ts` and corresponding Zod schema `briefingSectionSchema` in `src/models/schema.ts`
- [x] 3.2 Update `BriefingItem` schema in `src/models/schema.ts` to include `itemNumber` field

## 4. Verify

- [x] 4.1 Run TypeScript compiler — all files compile clean
