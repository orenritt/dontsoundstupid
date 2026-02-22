## Context

The user profile schema and onboarding flow exist but have no concept of how or when the daily briefing is delivered. Delivery preferences need to be added to the profile and collected during onboarding as a natural step in the flow — not as a separate settings experience.

## Goals / Non-Goals

**Goals:**
- Add delivery preference types to the profile schema
- Integrate channel/time/format selection into the existing onboarding flow as step 5 (between peer review and completion)
- Keep the schema extensible for future channels

**Non-Goals:**
- Implementing actual delivery infrastructure (email sending, Slack integration, etc.)
- Building a settings UI for changing preferences post-onboarding
- Channel-specific validation (e.g., verifying email deliverability, Slack OAuth)

## Decisions

### Decision 1: Delivery preferences as a separate model file

Create `src/models/delivery.ts` rather than adding to `identity.ts` or `context.ts`. Delivery preferences don't fit cleanly into either layer — they're not enrichment data and they're not work context. They're a standalone concern. Alternative: nesting under context layer — rejected because delivery config is orthogonal to work context.

### Decision 2: Channel as a discriminated union

Use a discriminated union type keyed on channel name, so each channel carries only its relevant config (email needs an address, Slack needs a workspace, SMS/WhatsApp need a phone number). Alternative: flat object with all optional fields — rejected because it allows invalid states (e.g., email channel with no address).

### Decision 3: Step 5 placement — after peer review, before completion

Delivery preferences come after all the "understanding you" steps are done. By this point the user has invested in the process and selecting a channel is a quick, low-friction final step before the payoff ("your first briefing is on its way"). Alternative: asking at the very start — rejected because it front-loads a decision before the user sees value.

## Risks / Trade-offs

- **Channel proliferation** — Supporting 4 channels from day one adds surface area. Mitigation: schema supports all 4 but MVP implementation can start with email only.
- **Timezone handling** — Storing preferred delivery time requires timezone awareness. Mitigation: store timezone explicitly alongside the time, don't infer.
