## Why

Don't Sound Stupid's entire value depends on understanding who the user is. Without a rich, accurate user profile, every briefing is generic noise. The profile model is the foundation — it determines what signals are relevant, what's ignorable, and what would embarrass the user to miss. We need to capture as much professional context as possible from minimal user input (a LinkedIn URL + a short conversation) so the briefing engine can deliver sharp, personalized intelligence from day one.

## What Changes

- Define a three-source user profile model:
  - **Person enrichment** (LinkedIn via Proxycurl) — the user's profile + an "impress list" (boss, board, investors, clients, mentors — anyone whose opinion matters)
  - **Company enrichment** (Clearbit/Crunchbase) — company size, industry, funding, hiring signals, tech stack, peer organizations
  - **Onboarding conversation** — current initiatives, concerns, terms they need to stay sharp on, what would embarrass them to not know
- Establish a two-layer schema: a stable **identity layer** (enrichment data, refreshed periodically) and a dynamic **context layer** (conversation-sourced, always evolving)
- Define the onboarding conversation flow: LinkedIn URLs → impress list → guided conversation → system-suggested peer orgs with user confirmation (Y/N + comments)
- Produce the schema that the briefing engine will match signals against

## Capabilities

### New Capabilities
- `user-profile`: Structured schema capturing identity (role, company, industry, geography, boss, company intel) and context (initiatives, competitors, concerns, keywords). Two-layer model with stable enrichment data and evolving conversational data.
- `onboarding-conversation`: Guided conversation flow that extracts the dynamic context layer from new users — their current initiatives, key concerns, competitors, and knowledge gaps.

### Modified Capabilities

## Impact

- New user profile schema definition (TypeScript types or JSON schema)
- New onboarding conversation script/flow definition
- Will become the primary input for the future briefing engine
- Dependencies: Proxycurl API (person enrichment), Clearbit or Crunchbase API (company enrichment)
