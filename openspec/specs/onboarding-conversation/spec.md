# onboarding-conversation Specification

## Purpose

Conversational onboarding that collects user context through free-text/voice input rather than structured forms. The flow uses an orb-based visual metaphor during the immersive first three steps (LinkedIn, conversation, impress list), then transitions to card-based UI for clarification and configuration. A single open-ended prompt replaces the previous multi-card context extraction, intelligence goals, and self-assessment steps. The system uses LLM parsing to extract structured data from the conversation transcript, then confirms understanding via a rapid-fire clarification round.

## Requirements

### Requirement: Guided Onboarding Flow

The system MUST provide a conversational onboarding flow that collects minimal structured input and maximizes what the system can infer from natural language.

#### Scenario: Step 1 — User provides their LinkedIn URL

- **WHEN** a new user begins onboarding
- **THEN** the system MUST present an orb-based immersive screen asking "Who are you?" with a single LinkedIn URL input
- **AND** MUST validate the LinkedIn URL format before proceeding
- **AND** MUST trigger person enrichment and company enrichment from that URL
- **AND** on successful enrichment, MUST display the user's photo and name within the orb before auto-advancing

#### Scenario: Step 2 — Conversational context extraction (free-text/voice)

- **WHEN** the user's LinkedIn is submitted
- **THEN** the system MUST present a single open-ended prompt asking the user to describe what they really do, what they're working on, what they're expert in, what they wish they knew more about, and what they're trying to accomplish
- **AND** MUST support both free-text input and voice input via Web Speech API
- **AND** MUST recommend voice input ("people tend to share more")
- **AND** MUST animate the orb to pulse during voice recording to indicate active listening
- **AND** MUST stream live transcript during voice recording
- **AND** MUST allow the user to review and edit the transcript before proceeding

#### Scenario: Step 3 — User provides their impress list

- **WHEN** the conversation step is completed
- **THEN** the system MUST ask "Who do we need to impress?" and accept multiple LinkedIn URLs via the orb-based UI
- **AND** MUST display added contacts as filled orbs with LinkedIn photos connected to the main orb cluster
- **AND** MUST require at least one contact before proceeding
- **AND** MUST trigger person enrichment for each provided URL

#### Scenario: Step 4 — Rapid-fire clarification

- **WHEN** the conversation transcript has been processed by the LLM
- **THEN** the system MUST present inferred topics/entities one at a time as cards
- **AND** for each topic MUST offer three response options: "Know tons" (maps to expert), "Need more" (maps to novice/developing), "Not relevant" (removes from tracking)
- **AND** MUST support swipe gestures on mobile (right = know tons, left = not relevant)
- **AND** MUST map responses to expertise levels for scoring override derivation

#### Scenario: Step 5 — Peer organization discovery and confirmation

- **WHEN** enrichment data and conversation data are both available
- **THEN** the system MUST research and present candidate peer organizations as cards
- **AND** for each candidate, MUST ask: "Is this organization relevant? Yes/No"
- **AND** MUST allow the user to add an optional comment per organization
- **AND** MUST allow the user to add organizations the system missed

#### Scenario: Step 6 — Delivery preferences

- **WHEN** peer review is completed
- **THEN** the system MUST collect delivery channel (email/Slack/SMS/WhatsApp), preferred time, timezone, and briefing format (concise/standard/detailed)

#### Scenario: Step 7 — Calendar connect (optional)

- **WHEN** delivery preferences are set
- **THEN** the system MUST offer optional calendar integration (Google Calendar / Outlook) via OAuth
- **AND** MUST allow the user to skip without penalty

#### Scenario: Step 8 — Profile complete

- **WHEN** the user has completed all steps
- **THEN** a full user profile (identity + context + peers + expertise calibration) MUST be persisted
- **AND** the profile MUST be ready for the briefing engine

### Requirement: Conversation Transcript Processing

The system MUST use LLM-powered parsing to extract structured context from free-text conversation input.

#### Scenario: Transcript to structured data

- **WHEN** the user completes the conversation step
- **THEN** the system MUST send the transcript to an LLM for extraction of: initiatives, concerns, topics, knowledge gaps, intelligence goals, expertise signals (expert areas + weak areas)
- **AND** MUST generate a list of inferred topics/entities for the rapid-fire clarification round
- **AND** MUST include one-line context per topic explaining why it was inferred

### Requirement: Onboarding Produces Actionable Profile

The onboarding process MUST produce a profile with enough context to generate relevant daily briefings from day one.

#### Scenario: Minimal input, maximum context

- **WHEN** onboarding completes
- **THEN** the system MUST have built a profile from: LinkedIn enrichment, a free-text/voice conversation, rapid-fire expertise calibration, and confirmed peer organizations
- **AND** the profile MUST contain enough context to generate a relevant daily briefing from day one
- **AND** the rapid-fire classifications MUST feed into scoring overrides and knowledge graph seeding aggressiveness
