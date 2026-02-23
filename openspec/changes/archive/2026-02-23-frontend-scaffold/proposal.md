## Why

The backend data model is complete — user profiles, signal ingestion, relevance scoring, knowledge graphs, briefing composition, delivery, and pipeline orchestration all have TypeScript types, Zod schemas, and Postgres schema. But there's no frontend for users to interact with. Users need a way to onboard (provide their LinkedIn, build their impress list, set intelligence goals), read their daily briefing (with inline feedback controls), manage their profile settings, and build trust by seeing what the system thinks they know. Without a frontend, the product can't ship.

## What Changes

- Define the frontend page model: onboarding wizard, briefing reader, profile settings, knowledge graph viewer, pipeline history, zero-briefing view
- Define UI state types: OnboardingWizardState, BriefingViewState, NavRoute, UINotification, ThemePreference
- Add Zod schemas for all UI types
- Establish framework choice: React + Next.js (App Router), Tailwind CSS, mobile-first responsive

## Capabilities

### New Capabilities
- `frontend-scaffold`: UI component structure and page model for the personalized intelligence briefing system — onboarding wizard, briefing reader with inline feedback, profile settings, knowledge graph transparency viewer, pipeline history, and zero-briefing experience

## Impact

- New UI types in the model layer (`src/models/ui.ts`)
- New Zod schemas appended to `src/models/schema.ts`
- Export updates in `src/models/index.ts`
- Depends on existing: user profile model, briefing model, feedback model, knowledge graph model, orchestrator model
