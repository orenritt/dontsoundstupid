## Why

The user profile captures who the user is and what they care about, but doesn't specify how or when they want to receive their daily briefing. Without delivery preferences, the system has no way to reach the user. Channel, timing, and format preferences are essential for the briefing to land — the best intelligence in the world is useless if it arrives in the wrong place at the wrong time.

## What Changes

- Add delivery preferences to the user profile schema: channel (email, Slack, SMS, WhatsApp), preferred delivery time, and format/conciseness preference
- Add a delivery preference step to the onboarding conversation flow, so users choose their channel during onboarding rather than in a separate settings screen

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-profile`: Add delivery preferences (channel, time, format) to the profile schema
- `onboarding-conversation`: Add a new step where the user selects their preferred delivery channel, time, and format

## Impact

- `src/models/identity.ts` or new `src/models/delivery.ts`: delivery preference types
- `src/models/profile.ts`: unified profile includes delivery preferences
- `src/models/schema.ts`: Zod validation for delivery preferences
- `src/onboarding/steps.ts`: new step type for channel selection
- `src/onboarding/script.ts`: new onboarding step added to the flow
- `src/onboarding/flow.ts`: updated step ordering
