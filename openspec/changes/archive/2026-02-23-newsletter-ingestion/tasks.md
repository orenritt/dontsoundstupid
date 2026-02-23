## 1. Data Model & Schema

- [x] 1.1 Add `newsletter_registry` table to Drizzle schema (id, name, description, website_url, industry_tags JSONB, ingestion_method enum, feed_url, syndication_feed_id FK, system_email_address, status enum, logo_url, created_at, updated_at)
- [x] 1.2 Add `user_newsletter_subscriptions` join table to Drizzle schema (id, user_id FK, newsletter_id FK, created_at; unique constraint on user_id + newsletter_id)
- [x] 1.3 Add `"newsletter"` to the signal layer enum in the SQL schema
- [x] 1.4 Add `"newsletter-subscription"` to the trigger_reason enum in the SQL schema
- [x] 1.5 Create and run database migration for new tables and enum extensions

## 2. Newsletter Registry API

- [x] 2.1 Create API route `GET /api/newsletters` — list active newsletters from registry (supports filtering by industry_tags)
- [x] 2.2 Create API route `POST /api/newsletters/subscribe` — subscribe current user to a newsletter by registry ID
- [x] 2.3 Create API route `DELETE /api/newsletters/subscribe` — unsubscribe current user from a newsletter
- [x] 2.4 Create API route `GET /api/newsletters/my` — list current user's newsletter subscriptions
- [x] 2.5 Create API route `POST /api/newsletters/submit` — handle "don't see yours?" submissions (URL or name), run auto-discovery, create registry entry if needed, subscribe user

## 3. Platform-Aware Feed Discovery

- [x] 3.1 Add Substack URL detection to `feed-discovery.ts` — if URL contains `substack.com`, try `{base}/feed` first
- [x] 3.2 Add Buttondown URL detection to `feed-discovery.ts` — if URL contains `buttondown.com`, try `https://buttondown.com/{name}/rss`
- [x] 3.3 Create `discoverNewsletterFeed(url: string)` function that combines platform-aware detection with existing `discoverFeeds` as fallback
- [x] 3.4 Wire newsletter feed discovery into the submit endpoint — on URL submission, attempt discovery and set ingestion_method accordingly

## 4. RSS Newsletter Integration

- [x] 4.1 When a newsletter is registered with `ingestion_method: "rss"`, create/link `syndication_feeds` entry and set `syndication_feed_id`
- [x] 4.2 Modify syndication polling (`ingest.ts`) to check if a polled feed is linked to a newsletter registry entry (via `syndication_feed_id` back-lookup)
- [x] 4.3 When a newsletter-linked feed produces signals, create additional provenance records with `trigger_reason: "newsletter-subscription"` for all subscribed users

## 5. System Email Newsletter Ingestion

- [x] 5.1 Create `src/lib/newsletter-ingest.ts` — core module with: recipient-to-newsletter lookup, HTML-to-text conversion (reuse `htmlToText` from email-forward), LLM story extraction call, signal creation per story, batch provenance creation
- [x] 5.2 Create LLM story extraction prompt — input: newsletter text body; output: JSON array of {title, summary, source_url, source_label}; model: gpt-4o-mini, temperature: 0.3
- [x] 5.3 Create signal creation logic — one signal per extracted story with layer `"newsletter"`, metadata includes newsletter_registry_id and newsletter_name
- [x] 5.4 Create batch provenance creation — for each signal, create provenance records for all users subscribed to that newsletter with trigger_reason `"newsletter-subscription"`
- [x] 5.5 Handle dedup — check source_url uniqueness and cross-layer semantic similarity before creating signals
- [x] 5.6 Create webhook route `POST /api/newsletter-ingest/webhook` — accept inbound email, verify webhook signature, extract recipient address, look up newsletter, process if active, discard if unknown/inactive
- [x] 5.7 Add error handling and logging — log extraction results, failures, unknown recipients, zero-story extractions

## 6. LLM Newsletter Ranking for Onboarding

- [x] 6.1 Create `src/lib/newsletter-ranking.ts` — takes user profile + newsletter registry, calls LLM to produce ranked list with "why" explanations
- [x] 6.2 Design ranking prompt — input: full user profile (role, company, initiatives, concerns, topics, weak areas, rapid-fire classifications, peer orgs) + newsletter registry (name, description, industry_tags); output: JSON array of {newsletter_id, rank, why_explanation}, ordered most specifically relevant → generally useful
- [x] 6.3 Create API route `GET /api/newsletters/suggestions` — calls ranking function with current user's profile, returns ranked list with why explanations
- [x] 6.4 Add fallback — if LLM fails, return newsletters sorted by subscription count

## 7. Onboarding Frontend — Newsletter Step

- [x] 7.1 Create newsletter suggestion step component — card-based layout consistent with Steps 4-7, shows ranked newsletter cards with name, description, "why" line, and "Add to my content universe" button
- [x] 7.2 Implement "Add to my content universe" button — calls subscribe API, toggles to "Added ✓" state, supports undo
- [x] 7.3 Implement "Don't see yours?" input — accepts URL or plain name, calls submit API, shows appropriate confirmation/pending message
- [x] 7.4 Add loading state — skeleton cards with "Finding newsletters for you..." while LLM ranking runs
- [x] 7.5 Add skip/continue — "Continue" button always visible, no minimum selections required
- [x] 7.6 Wire into onboarding flow — insert as Step 8 after calendar connect (Step 7), update profile complete to Step 9
- [x] 7.7 Update onboarding progress tracking to account for the new step count (9 steps instead of 8)

## 8. Settings — Newsletter Management

- [x] 8.1 Add "Content Universe" or "Newsletters" section to settings page — list subscribed newsletters with name, description, status badge (active/pending)
- [x] 8.2 Add remove button per newsletter — calls unsubscribe API
- [x] 8.3 Add "Add more" section — same "Don't see yours?" input as onboarding, plus browsable list of available newsletters from registry

## 9. Admin Newsletter Management

- [x] 9.1 Create admin API route `GET /api/admin/newsletters` — list all registry entries with subscription counts, sortable by status and request count
- [x] 9.2 Create admin API route `POST /api/admin/newsletters` — add newsletter to registry (name, description, industry_tags, ingestion_method, feed_url or system_email slug)
- [x] 9.3 Create admin API route `PATCH /api/admin/newsletters/:id` — update newsletter (activate, deactivate, change ingestion method, set system email slug)
- [x] 9.4 Create admin API route `GET /api/admin/newsletters/pending` — list pending requests sorted by user request count
- [x] 9.5 Add stale newsletter detection — flag system-email newsletters with no inbound email for 30+ days

## 10. Pipeline Integration

- [x] 10.1 Update `runPipeline` in `pipeline.ts` to include newsletter signals in the candidate pool — query signals with layer `"newsletter"` that have provenance for the current user since last briefing
- [x] 10.2 Verify scoring agent correctly boosts newsletter signals via existing provenance-based relevance boost (no code change expected — just verify)

## 11. Infrastructure Setup

- [ ] 11.1 Configure newsletter ingestion subdomain MX records (e.g., `newsletters.dontsoundstupid.com`) pointing to inbound email provider
- [ ] 11.2 Configure catch-all inbound email routing to the `/api/newsletter-ingest/webhook` endpoint
- [x] 11.3 Seed initial newsletter registry with 20-30 popular newsletters across industries (finance, tech, policy, healthcare, legal, real estate) with descriptions and industry tags
