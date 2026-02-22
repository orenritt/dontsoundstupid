## Why

The daily briefing is valuable, but it's generic in timing — it arrives once a day regardless of what the user's day actually looks like. If the user has a meeting with their VP of Sales at 2pm, they need to know what that VP cares about, what's happening in their division, and any recent news *before* that meeting — not in a morning dump they might skim past. Calendar integration turns the product from "daily news you should know" into "here's what you need to know before your 2pm with Sarah." This is more urgent, more actionable, and harder to ignore.

## What Changes

- Add optional calendar sync (Google Calendar, Outlook) that pulls upcoming meetings and attendees
- When a meeting is detected, look up attendees — cross-reference with enrichment APIs to understand who they are, what they care about, what's happening in their world
- Generate meeting-specific intelligence: relevant news, attendee interests, recent activity, talking points
- Add calendar connection as an optional step in onboarding
- Calendar data feeds into the profile as a dynamic signal layer — upcoming meetings and attendees inform what's relevant *today*

## Capabilities

### New Capabilities
- `calendar-sync`: Optional calendar integration that syncs upcoming meetings and attendee data to inform meeting-specific briefings

### Modified Capabilities
- `user-profile`: Add calendar connection status and meeting attendee data as a signal source
- `onboarding-conversation`: Add optional calendar connection step during onboarding

## Impact

- New calendar sync types and interfaces
- New meeting attendee enrichment logic (reuses existing person enrichment)
- Modified user profile to include calendar connection and upcoming meeting context
- Modified onboarding flow with optional calendar step
- Dependencies: Google Calendar API, Microsoft Graph API (Outlook)
