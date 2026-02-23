## 1. Feed Management Model

- [ ] 1.1 Create `src/models/syndication.ts` with: FeedSource (url, type rss/atom/scrape, poll interval, status), FeedSubscription (feed ID, user IDs), FeedPollState (last fetched, last item date, error count)
- [ ] 1.2 Add Zod schemas for syndication types in `src/models/schema.ts`
- [ ] 1.3 Export new types from `src/models/index.ts`

## 2. Database Schema

- [ ] 2.1 Add feed_sources table to `src/db/schema.sql`
- [ ] 2.2 Add feed_subscriptions table (feed-to-user mapping)
- [ ] 2.3 Add feed_poll_state table for tracking last-fetched state

## 3. Verify

- [ ] 3.1 Run TypeScript compiler — all files compile clean
