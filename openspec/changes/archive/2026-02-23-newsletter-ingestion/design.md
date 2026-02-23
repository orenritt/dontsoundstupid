## Context

The system currently ingests signals from four sources: GDELT news, RSS/Atom syndication, email forwards (user-curated), and LLM-generated research. Newsletters — one of the highest-signal content types for professionals — are not ingested at all. Outside tech (where Substack/Ghost expose RSS), most newsletters run on platforms with no programmatic access (Mailchimp, Constant Contact, HubSpot, custom systems).

The existing infrastructure provides strong primitives to build on:
- **Syndication layer** already polls RSS/Atom feeds and creates signals — newsletter RSS feeds can route through this.
- **Email forward webhook** already receives inbound email and creates signals — the newsletter system email path uses similar plumbing but with LLM-based story extraction instead of single-signal creation.
- **Signal store** supports multiple layers with provenance tracking — adding a `"newsletter"` layer is straightforward.
- **Feed discovery** (`feed-discovery.ts`) probes common paths and HTML link tags — needs enhancement with platform-aware URL patterns.

The design uses a "man behind the curtain" approach: the user sees a uniform "Add to my content universe" button for every newsletter. Behind the scenes, some newsletters are ingested via RSS (automated) and others via a system email that an admin subscribes manually. One system email subscription serves all users who want that newsletter.

## Goals / Non-Goals

**Goals:**
- Create a central newsletter registry shared across all users, seeded by admins and grown by user requests
- Ingest newsletter content via two paths (RSS where available, system email for everything else) and extract individual stories as separate signals
- Present LLM-ranked newsletter suggestions during onboarding, personalized to the user's full profile
- Provide a "don't see yours?" flow that auto-discovers Substack/RSS URLs and queues plain-name requests for admin setup
- Make the user experience identical regardless of backend ingestion method

**Non-Goals:**
- Gmail/Outlook API integration (reading newsletters from users' inboxes) — too much trust overhead
- Per-user ingest email addresses — one system email per newsletter, shared across all users
- Automated admin setup of non-RSS newsletters — admin manually subscribes the system email
- Full newsletter archive browsing — newsletters feed into the signal/briefing pipeline like any other source
- Newsletter content behind paywalls — only free/public newsletter content

## Decisions

### Decision 1: Newsletter registry as a shared catalog

**Choice:** A central `newsletter_registry` table that stores each newsletter once, independent of how many users follow it. Users link to newsletters via a `user_newsletter_subscriptions` join table.

**Why over per-user subscriptions:** One system email subscription to Money Stuff serves 500 users. The registry becomes a curated asset — the more users onboard, the more newsletters are pre-configured. Admin effort is amortized.

**Registry fields:**
- `id`, `name`, `description` (used by the LLM for matching), `website_url`
- `industry_tags` (JSONB array — e.g., `["finance", "venture-capital"]`)
- `ingestion_method`: `"rss"` | `"system_email"` | `"pending"`
- `feed_url` (nullable — populated for RSS newsletters)
- `syndication_feed_id` (nullable FK — links to existing `syndication_feeds` when ingestion_method is `"rss"`, so the existing polling infra handles it)
- `system_email_address` (nullable — the specific system email subscribed to this newsletter, e.g., `money-stuff@newsletters.dontsoundstupid.com`)
- `status`: `"active"` | `"pending_admin_setup"` | `"inactive"`
- `logo_url` (nullable — for UI display)
- `created_at`, `updated_at`

### Decision 2: Dual ingestion paths

**RSS path:** When a newsletter has a discoverable RSS feed (Substack, Ghost, Beehiiv, Buttondown, or any standard RSS/Atom), we create a `syndication_feeds` entry and let the existing polling infrastructure handle it. The `newsletter_registry` entry points to the `syndication_feeds` row via `syndication_feed_id`. Signals created from these feeds get layer `"syndication"` as they do today — the newsletter provenance is tracked via the registry linkage, not a separate layer.

**System email path:** For newsletters without RSS, an admin subscribes a shared system email address (e.g., `money-stuff@newsletters.dontsoundstupid.com`) to the newsletter. When the newsletter email arrives:

```
Newsletter email
      │
      ▼
Inbound email webhook (new route: /api/newsletter-ingest/webhook)
      │
      ▼
Identify newsletter by recipient address
(lookup system_email_address in newsletter_registry)
      │
      ▼
LLM story extraction
(parse HTML body → extract individual stories with title, summary, source URL)
      │
      ▼
Create one signal per story (layer: "newsletter")
      │
      ▼
Create provenance for all users subscribed to this newsletter
(trigger_reason: "newsletter-subscription")
```

**Why a separate webhook route:** The existing email-forward webhook identifies senders by matching against user emails. Newsletter emails come from newsletter platforms (e.g., `noreply@substack.com`), not users. The routing logic is fundamentally different — we match on the *recipient* address to identify the newsletter, not the sender to identify the user.

**Alternatives considered:**
- *Reuse email-forward webhook:* Rejected — different routing logic (recipient-based vs sender-based), different processing (LLM multi-story extraction vs single-signal creation), different provenance model (shared vs per-user).
- *Single "newsletter" layer for both RSS and email:* Rejected — RSS newsletters should flow through the existing syndication polling with its error handling, backoff, and dedup. Adding a parallel polling system for RSS newsletters would duplicate infrastructure.

### Decision 3: LLM story extraction from newsletter emails

**Choice:** When a newsletter email arrives via the system email path, use an LLM to extract individual stories from the newsletter body. Each story becomes its own signal.

**Prompt design:** The LLM receives the newsletter HTML-to-text body and returns a JSON array of stories, each with: `title`, `summary` (1-2 sentences), `source_url` (if a link is referenced), `source_label` (publication name). This mirrors the `RawSignal` interface already used in the pipeline.

**Why LLM over structural parsing:** Newsletters have wildly different HTML structures. A finance newsletter looks nothing like a policy roundup. Rule-based parsing would need per-newsletter templates. An LLM handles the structural variation naturally.

**Model choice:** GPT-4o-mini with low temperature (0.3) — same pattern as the briefing composition step. Extraction is factual, not creative.

### Decision 4: Platform-aware feed discovery

**Choice:** Enhance `feed-discovery.ts` with known URL patterns for major newsletter platforms before falling back to generic discovery.

**Platform patterns:**
| Platform | Pattern | Detection |
|----------|---------|-----------|
| Substack | `https://{name}.substack.com/feed` | URL contains `substack.com` |
| Ghost | `https://{domain}/rss/` | Probe `/rss/` path (already in common paths) |
| Beehiiv | `https://{domain}/rss.xml` | Probe `/rss.xml` (already in common paths) |
| Buttondown | `https://buttondown.com/{name}/rss` | URL contains `buttondown.com` |

**Why not use a feed discovery API (FeedBagel, RSS.app):** Adding an external dependency for something that's a simple URL pattern match is unnecessary complexity. The existing `discoverFeeds` function already handles HTML link tags and common paths — we're just adding platform-specific shortcuts.

### Decision 5: LLM-ranked newsletter suggestions at onboarding

**Choice:** After the user's profile is fully built (post-conversation, post-rapid-fire, post-peer-orgs), send the full user profile + the entire newsletter registry to an LLM. The LLM returns a ranked list ordered from most specifically relevant to generally useful, with a short "why" for each.

**New onboarding step:** Inserted between Step 7 (Calendar Connect) and Step 8 (Profile Complete) in the current flow. This becomes the new Step 8, and Profile Complete becomes Step 9.

**Suggestion UX:** Card-based (consistent with Steps 4-7), showing newsletter name, description, and the LLM-generated "why" line. Each card has an "Add to my content universe" button. All selections create `user_newsletter_subscriptions` rows. The user sees no distinction between RSS-backed and email-backed newsletters.

**"Don't see yours?" handling:**
1. User pastes a URL → system checks if it's a Substack or known platform → tries feed discovery → if found, creates registry entry with `ingestion_method: "rss"` and subscribes user
2. User pastes a URL → no feed found → creates registry entry with `status: "pending_admin_setup"` and subscribes user (they'll start getting signals once admin activates it)
3. User types a name → creates registry entry with `status: "pending_admin_setup"` and subscribes user

### Decision 6: Provenance model for newsletter signals

**Choice:** Two provenance paths depending on ingestion method:

- **RSS newsletters:** Signals come through the syndication layer. Provenance is tagged as `trigger_reason: "newsletter-subscription"` with `profile_reference` set to the newsletter registry name. This extends the existing syndication provenance model.
- **System email newsletters:** Signals are created with layer `"newsletter"`. Provenance records are created for every user subscribed to that newsletter, with `trigger_reason: "newsletter-subscription"`.

**Scoring integration:** The scoring agent already boosts signals with direct provenance for the user. Newsletter subscriptions create provenance records, so newsletter signals automatically get a relevance boost for subscribed users without changes to the scoring logic.

### Decision 7: Inbound email service selection

**Choice:** Use the same inbound email service already configured for email forwards. The newsletter webhook is a separate route (`/api/newsletter-ingest/webhook`) but uses the same provider infrastructure.

**Domain setup:** Configure a subdomain (e.g., `newsletters.dontsoundstupid.com`) with MX records pointing to the inbound email provider. Admin creates addresses like `money-stuff@newsletters.dontsoundstupid.com` when setting up non-RSS newsletters. Alternatively, use a single catch-all address and route by the `To` header — simpler but less organized.

**Why catch-all with routing:** A single MX record and catch-all is easier to set up. The webhook receives all emails to `*@newsletters.dontsoundstupid.com`, and the handler looks up which newsletter the address belongs to. Admin just picks a slug when activating a newsletter.

## Risks / Trade-offs

**[LLM extraction quality varies by newsletter format]** → Mitigation: Start with well-known newsletters where extraction quality can be validated. Log extraction results for admin review. Add per-newsletter extraction prompt overrides if needed.

**[Admin bottleneck for non-RSS newsletters]** → Mitigation: This is intentional. The registry grows over time and most popular newsletters will be pre-configured quickly. The "don't see yours?" queue gives visibility into demand. We can automate later if volume warrants it.

**[System email subscriptions require confirmation clicks]** → Mitigation: Admin handles this manually. Some newsletters use double opt-in, which means the admin needs to click a confirmation link in the system email inbox. This is a one-time cost per newsletter.

**[Newsletter content may duplicate signals from other layers]** → Mitigation: The existing cross-layer dedup (semantic similarity check on ingestion) handles this. A newsletter story about the same event as a GDELT news article will be linked rather than duplicated.

**[Registry grows stale if newsletters shut down]** → Mitigation: For RSS newsletters, the existing syndication error handling (deactivate after 10 consecutive failures) covers this. For system email newsletters, if no email arrives for 30+ days, flag for admin review.

**[LLM cost for story extraction]** → Mitigation: GPT-4o-mini is cheap. A typical newsletter has 5-10 stories. At ~1000 tokens per newsletter, extraction costs are negligible compared to existing signal generation and scoring.

## Open Questions

- **Catch-all vs. per-newsletter email addresses?** Catch-all is simpler to set up but harder to debug if emails aren't arriving. Per-newsletter addresses are more explicit but require admin to create an email alias for each newsletter. Leaning toward catch-all with slug-based routing.
- **Should the newsletter suggestion step be skippable?** Probably yes — consistent with calendar connect being skippable. But it's high-value so should feel inviting, not obligatory.
- **Admin UI scope for v1?** Could be a simple database-backed page or even a CLI tool. Full admin dashboard can come later.
