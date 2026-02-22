## Context

The user profile context layer captures what the user is working on and what concerns them, but doesn't capture *how* they want to stay informed. Intelligence goals define the lens through which signals should be filtered and prioritized. This is a lightweight addition to the existing context model and conversation flow.

## Goals / Non-Goals

**Goals:**
- Add intelligence goals as a typed, selectable set of categories in the context layer
- Allow both predefined categories and user-defined custom goals
- Integrate naturally into the existing conversation step (not a separate onboarding step)
- Store goals in the context layer so they're captured in history snapshots

**Non-Goals:**
- Weighting or ranking goals by importance (future enhancement)
- Changing the briefing engine to consume goals (that's the briefing engine change)
- Adding a separate UI for goal management

## Decisions

### Decision 1: Intelligence goals as part of the conversation step, not a separate step

The "what does not sounding stupid mean to you?" question fits naturally within the existing conversation step (step 3). It's part of understanding the user's work context, not a separate configuration concern. Adding it as a new onboarding step would make the flow feel longer than necessary. Alternative: separate step — rejected to keep onboarding tight.

### Decision 2: Predefined categories with custom extension

Offer a set of ~8 predefined goal categories (industry trends, jargon, new entrants, best practices, research, regulatory, competitive, network). Users can select multiple and add custom ones. This balances ease of selection with flexibility. Alternative: fully free-form — rejected because structured categories help the briefing engine prioritize signal types.

### Decision 3: Goals stored with optional user detail

Each goal has a category ID and an optional free-text detail field. For example: category "regulatory" with detail "FDA approval process changes" — the detail gives the briefing engine more specificity. Alternative: just category IDs — rejected because the detail is high-value signal.

## Risks / Trade-offs

- **Category list may not be exhaustive** — Mitigation: custom goals cover gaps, and we can expand the predefined list based on usage patterns.
