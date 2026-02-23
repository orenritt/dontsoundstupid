## Why

Signals are scored, user profiles are rich with context, but there's no component that synthesizes scored signals into a personalized, coherent daily briefing. Users need intelligence delivered in their preferred format, on their preferred channel, at their preferred time — not a raw feed of scored items. The Briefing Composer is the LLM-powered bridge between the relevance engine's output and the user's morning read: it takes top-scored signals, injects user context (role, initiatives, intelligence goals), and composes a narrative briefing adapted to format (concise/standard/detailed) and channel (email/Slack/SMS/WhatsApp).

## What Changes

- Define ComposerConfig: LLM provider selection (OpenAI, Anthropic), model, token limits, temperature
- Define BriefingPrompt: the full context payload sent to the LLM — user summary, scored signals, format preference, optional meeting context
- Define ComposedBriefing: the LLM output — titled sections with content and source signal attribution
- Define DeliveryAttempt: tracks each delivery try per channel with status and error handling
- Define BriefingSchedule: per-user delivery scheduling with timezone-aware next-delivery tracking
- Add DB tables for delivery attempts and briefing schedules

## Capabilities

### New Capabilities
- `briefing-composer`: LLM-powered composition of personalized daily briefings from scored signals, with format adaptation, channel-specific formatting, context injection, signal attribution, and meeting-aware intelligence

## Impact

- New composer, delivery, and scheduling types in the model layer
- New DB tables for briefing_deliveries and briefing_schedules
- Depends on existing: user profiles (delivery preferences, context, calendar), briefing model, signal model
