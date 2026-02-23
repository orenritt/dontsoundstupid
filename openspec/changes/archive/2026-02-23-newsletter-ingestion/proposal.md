## Why

Newsletters are some of the highest-signal content professionals consume — curated by domain experts, timely, opinionated — but they're locked inside email inboxes with no universal programmatic access. Outside the tech bubble (where Substack/Ghost provide RSS), the majority of newsletters in finance, policy, healthcare, real estate, and legal run on Mailchimp, Constant Contact, HubSpot, or custom platforms with no feeds and no APIs. The system currently has no way to ingest newsletter content, leaving a major gap in the signal corpus for non-tech users.

## What Changes

- **Newsletter registry**: A central, shared catalog of newsletters with metadata (name, description, industry/topic tags, ingestion method, feed URL if applicable, status). One entry per newsletter regardless of how many users follow it. Seeded by admins, grown by user requests.
- **User-newsletter subscriptions**: A link table connecting users to newsletters they've added to their "content universe." Drives which newsletter-sourced signals are considered during scoring for each user.
- **Dual ingestion backend**:
  - *RSS path*: For newsletters with discoverable feeds (Substack, Ghost, Beehiiv, Buttondown, any RSS/Atom). Enhances existing feed discovery with platform-aware URL patterns. Feeds into existing syndication polling.
  - *System email path*: For newsletters without feeds. An admin subscribes a shared system email address to the newsletter. Inbound emails arrive via webhook (CloudMailin, SendGrid, or similar), are parsed by an LLM to extract individual stories/signals, and stored in the signal store with layer `"newsletter"`.
- **LLM-powered newsletter suggestions during onboarding**: After the user's full profile is built (post-conversation, post-rapid-fire, post-peer-orgs), an LLM ranks newsletters from the registry by relevance to the specific user — most specifically relevant first, generally useful last. Each suggestion includes a short "why" explanation.
- **"Add to my content universe" UI**: Uniform button for every suggested newsletter regardless of backend ingestion method. User sees no difference between RSS-backed and system-email-backed newsletters.
- **"Don't see yours?" input**: Accepts a Substack URL, RSS feed URL, or plain newsletter name. URLs trigger auto-discovery; plain names create a pending admin request.
- **Admin tooling**: View pending newsletter requests, subscribe system email, activate newsletters, manage the registry.

## Capabilities

### New Capabilities
- `newsletter-ingestion`: Central newsletter registry, dual-path ingestion (RSS + system email), LLM-based story extraction from newsletter emails, newsletter signal layer.
- `newsletter-onboarding`: LLM-ranked newsletter suggestions at end of onboarding, "add to content universe" interaction, "don't see yours?" user-submitted newsletter handling.

### Modified Capabilities
- `onboarding-conversation`: Add a new step after calendar connect (Step 7) and before profile complete — the newsletter suggestion step where users add newsletters to their content universe.
- `signal-store`: Add `"newsletter"` as a recognized source layer alongside existing layers. Newsletter signals carry provenance linking them to the originating newsletter registry entry.
- `syndication-ingestion`: Newsletter RSS feeds discovered via platform-aware patterns route through the existing syndication polling infrastructure.

## Impact

- **Database**: New tables for newsletter registry, user-newsletter subscriptions, and pending newsletter requests. Signal store layer enum extended with `"newsletter"`.
- **Inbound email infrastructure**: Requires setting up an inbound email webhook service (CloudMailin or SendGrid inbound parse) with MX records for a system email domain.
- **LLM usage**: Two new LLM touchpoints — newsletter suggestion ranking during onboarding, and story extraction from inbound newsletter emails.
- **Scoring agent**: Must consider user-newsletter subscription links when scoring signals from the newsletter layer.
- **Frontend**: New onboarding step UI (newsletter suggestions + add buttons + "don't see yours" input). Settings page for managing newsletter subscriptions post-onboarding.
- **Admin surface**: Newsletter registry management and pending request queue.
