## Why

The system knows *who* the user is and *what* they're working on, but not *why* they care about staying informed. Someone tracking new jargon needs different signals than someone following academic research or monitoring regulatory changes. Without understanding the user's intelligence goals, the briefing engine has no way to prioritize signal types — it treats all information equally, when in reality each user has specific dimensions of "not sounding stupid" that matter most to them.

## What Changes

- Add intelligence goals to the user profile context layer — a set of user-selected (and customizable) goals that describe what kind of information matters most to them
- Expand the onboarding conversation to ask "What does 'not sounding stupid' mean for you?" — presenting common goals and allowing free-form additions
- Intelligence goals are stored in the context layer and are updatable as user priorities shift

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-profile`: Add intelligence goals to the context layer — user-selected categories of information they care about most
- `onboarding-conversation`: Add a question during the conversation step that captures the user's intelligence goals

## Impact

- `src/models/context.ts`: Add intelligence goals to ContextLayer
- `src/models/schema.ts`: Add Zod validation for intelligence goals
- `src/onboarding/steps.ts`: Add intelligence goals input type
- `src/onboarding/script.ts`: Add intelligence goals question to conversation step
