## ADDED Requirements

### Requirement: Guided Onboarding Flow

The system MUST provide a guided onboarding flow that collects minimal input from the user and maximizes what the system can infer and enrich automatically.

#### Scenario: Step 1 — User provides their LinkedIn URL

- **WHEN** a new user begins onboarding
- **THEN** the system MUST ask for their LinkedIn URL
- **AND** MUST trigger person enrichment and company enrichment from that URL

#### Scenario: Step 2 — User provides their impress list

- **WHEN** the user's LinkedIn is submitted
- **THEN** the system MUST ask "Who do you want to impress?" and accept multiple LinkedIn URLs
- **AND** MUST explain these can be their boss, board members, investors, clients, mentors — anyone whose opinion matters
- **AND** MUST trigger person enrichment for each provided URL

#### Scenario: Step 3 — Conversational context extraction

- **WHEN** enrichment data is retrieved
- **THEN** the system MUST conduct a short guided conversation covering:
  - What are you actually working on right now?
  - What are the biggest challenges or concerns in your work?
  - What terms or topics do you need to stay sharp on?
  - What would embarrass you to not know about in your next meeting?

#### Scenario: Step 4 — Peer organization discovery and confirmation

- **WHEN** enrichment data and conversation data are both available
- **THEN** the system MUST research and present candidate peer organizations
- **AND** for each candidate, MUST ask: "Is this organization similar to yours? Y/N"
- **AND** MUST allow the user to add an optional comment per organization
- **AND** MUST allow the user to add organizations the system missed

#### Scenario: Step 5 — Profile complete

- **WHEN** the user has confirmed/rejected peer organizations
- **THEN** a full user profile (identity + context + peers) MUST be persisted
- **AND** the profile MUST be ready for the briefing engine

### Requirement: Onboarding Produces Actionable Profile

The onboarding process MUST produce a profile with enough context to generate relevant daily briefings from day one.

#### Scenario: Minimal input, maximum context

- **WHEN** onboarding completes
- **THEN** the system MUST have built a profile from: 1+ LinkedIn URLs, company enrichment, a short conversation, and confirmed peer organizations
- **AND** the profile MUST contain enough context to generate a relevant daily briefing from day one
