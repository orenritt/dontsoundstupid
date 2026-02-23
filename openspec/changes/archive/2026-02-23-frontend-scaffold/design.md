## Context

The backend data model is complete: user profiles with identity/impress/context/peers/delivery/calendar layers, signal ingestion across five layers (syndication, research, narrative, events, personal-graph), relevance scoring with novelty filtering, LLM-powered briefing composition, and pipeline orchestration. The frontend needs to present this intelligence to users and collect their inputs — onboarding data, inline briefing feedback, profile edits, and knowledge graph corrections.

## Goals / Non-Goals

**Goals:**
- Define the complete page/route model for the frontend application
- Define UI state types that map to backend domain models
- Establish framework and styling decisions (React + Next.js App Router, Tailwind CSS)
- Mobile-first responsive design — briefings are consumed on phones
- Clean, minimal UI focused on information density over visual noise
- Type-safe frontend state that mirrors the existing Zod-validated backend models

**Non-Goals:**
- Actual component implementation (this change defines structure, not renders)
- API endpoint definitions (handled by a separate backend API change)
- Authentication/authorization UI (separate concern)
- Real-time WebSocket updates (daily briefings are batch-delivered)
- Analytics or telemetry instrumentation

## Decisions

### Decision 1: React + Next.js App Router

Use Next.js with the App Router for file-based routing, server components, and built-in API route support. The App Router's layout system maps naturally to the application's page hierarchy: a root layout with navigation, nested layouts for settings, and standalone pages for onboarding and briefing reading.

### Decision 2: Tailwind CSS with minimal custom design system

Use Tailwind CSS utility classes for styling. No custom component library — rely on composing Tailwind utilities with a small set of design tokens (colors, spacing scale, font sizes) defined in `tailwind.config.ts`. This keeps the UI minimal and information-dense without a heavy design system dependency.

### Decision 3: Onboarding as a multi-step wizard with client-side state

The onboarding flow is a single-page wizard with client-side step navigation, not separate pages per step. This avoids unnecessary page transitions, keeps all step data in a single `OnboardingWizardState` object, and allows back-navigation without re-fetching. Data is submitted to the server only on final completion.

### Decision 4: Briefing reader as the default home view

After onboarding, the briefing reader is the landing page. It shows the most recent briefing (or zero-briefing view). This matches the primary user workflow: open app → read today's briefing → provide feedback → done.

### Decision 5: Bottom-tab navigation on mobile, sidebar on desktop

Mobile uses a persistent bottom navigation bar with 4 tabs: Briefing (home), Knowledge, History, Settings. Desktop (≥1024px) uses a collapsible left sidebar. This follows mobile-first patterns where the primary navigation must be thumb-reachable.

### Decision 6: UI state types in the model layer

Frontend state types (OnboardingWizardState, BriefingViewState, NavRoute, UINotification, ThemePreference) live in `src/models/ui.ts` alongside the backend types. This ensures the frontend's type vocabulary is validated by the same Zod schema infrastructure and stays consistent with the domain model.

## Risks / Trade-offs

- **Server components vs. interactivity** — Briefing feedback controls, wizard navigation, and knowledge graph edits require client components. The App Router's boundary between server and client components needs careful management to avoid shipping unnecessary JavaScript.
- **Mobile-first trade-off** — Designing for phone consumption first means desktop may feel sparse. Mitigated by responsive breakpoints that expand content width and add sidebar navigation on larger viewports.
- **Wizard state persistence** — If a user closes the browser mid-onboarding, their progress is lost (client-side only). Acceptable for MVP since onboarding is a one-time 5-minute flow. Can add localStorage persistence later if needed.
- **Knowledge graph rendering** — Displaying entities grouped by type is straightforward. A visual graph visualization (nodes and edges) would be more compelling but is out of scope for the scaffold. The initial view is a categorized list.
