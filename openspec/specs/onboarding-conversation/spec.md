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

#### Scenario: Step 2 — Open-ended guided conversation (free-text/voice)

- **WHEN** the user's LinkedIn is submitted
- **THEN** the system MUST present guided prompts one at a time from a pool of questions:
  1. "Walk me through a typical day."
  2. "Tell me about a project you're deep in right now."
  3. "What do you wish you understood better?"
  4. "What tools or concepts do you wish you had a better grasp of?"
  5. "What's one thing that caught you off guard recently?"
- **AND** the first prompt MUST be required (minimum 10 characters)
- **AND** after each answer, the system MUST present a choice: "Ask me another" or "That's enough — let's go"
- **AND** "Ask me another" MUST advance to the next prompt from the pool
- **AND** "That's enough" MUST submit all collected Q&A pairs and proceed
- **AND** if all prompts are exhausted, the system MUST auto-transition to a summary screen and submit
- **AND** each prompt MUST have descriptive subtext and placeholder text to anchor the user
- **AND** MUST show progress ticks for completed answers
- **AND** MUST support both free-text input and voice input via Web Speech API for each prompt
- **AND** MUST recommend voice input on the first prompt ("people share more")
- **AND** MUST animate the orb to pulse during voice recording to indicate active listening
- **AND** MUST stream live transcript during voice recording
- **AND** on submission, MUST concatenate all Q&A pairs into a single transcript for LLM parsing

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

#### Scenario: Step 8 — Newsletter suggestions

- **WHEN** calendar connect is completed or skipped
- **THEN** the system MUST present LLM-ranked newsletter suggestions from the newsletter registry, personalized to the user's full profile
- **AND** MUST allow the user to add newsletters to their content universe
- **AND** MUST provide a "Don't see yours?" input accepting URLs or newsletter names
- **AND** MUST allow the user to skip without penalty

#### Scenario: Step 9 — Profile complete

- **WHEN** the user has completed all steps (including or skipping the newsletter step)
- **THEN** a full user profile (identity + context + peers + expertise calibration + newsletter subscriptions) MUST be persisted
- **AND** the profile MUST be ready for the briefing engine

### Requirement: Conversation Transcript Processing

The system MUST use LLM-powered parsing to extract structured context from free-text conversation input, preserving the user's niche-specific language.

#### Scenario: Transcript to structured data

- **WHEN** the user completes the conversation step
- **THEN** the system MUST send the transcript to an LLM for extraction of: initiatives, concerns, topics, knowledge gaps, intelligence goals, expertise signals (expert areas + weak areas)
- **AND** MUST generate a list of inferred topics/entities for the rapid-fire clarification round
- **AND** MUST include one-line context per topic explaining why it was inferred

#### Scenario: Topic extraction preserves niche specificity

- **WHEN** the LLM extracts topics from the conversation transcript
- **THEN** the LLM MUST preserve the user's exact niche phrasing as intersectional descriptors rather than generalizing to taxonomic parent categories
- **AND** if the user says "nature-based insurance for coral reef restoration", the extracted topic MUST be "nature-based insurance for coral reef restoration" or similar niche-preserving phrasing, NOT "insurtech" or "climate risk" as standalone topics
- **AND** the LLM MUST extract topics as phrases that capture the intersection of the user's specific domain, NOT as independent keywords that could each match broad content

#### Scenario: Two-tier topic extraction

- **WHEN** the LLM extracts topics from the conversation transcript
- **THEN** the LLM MUST produce two distinct tiers:
  1. `topics`: Intersectional niche descriptors that define the user's specific content scope (used as search inputs and content universe coreTopics candidates)
  2. `contextTerms`: Individual terms that provide background context but MUST NOT be used as standalone search queries (e.g., "insurance", "coral reefs" — useful as context, dangerous as queries)
- **AND** the LLM prompt MUST explicitly instruct: "Do NOT generalize to parent categories. If the user works at the intersection of two fields, the topic is the intersection, not each field independently."

#### Scenario: Rapid-fire classifications as exclusion signals

- **WHEN** the user marks a topic as "Not relevant" during the rapid-fire clarification round
- **THEN** the system MUST store this classification as a strong exclusion signal
- **AND** the "not-relevant" topic MUST be passed to content universe generation as an explicit exclusion candidate

### Requirement: Onboarding Produces Actionable Profile

The onboarding process MUST produce a profile with enough context to generate relevant daily briefings from day one.

#### Scenario: Minimal input, maximum context

- **WHEN** onboarding completes
- **THEN** the system MUST have built a profile from: LinkedIn enrichment, a free-text/voice conversation, rapid-fire expertise calibration, and confirmed peer organizations
- **AND** the profile MUST contain enough context to generate a relevant daily briefing from day one
- **AND** the rapid-fire classifications MUST feed into scoring overrides and knowledge graph seeding aggressiveness
