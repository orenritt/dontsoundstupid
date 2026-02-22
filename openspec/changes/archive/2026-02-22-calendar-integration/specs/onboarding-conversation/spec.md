## MODIFIED Requirements

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

#### Scenario: Step 5 — Optional calendar connection

- **WHEN** the user has completed peer organization review
- **THEN** the system MUST offer to connect their calendar (Google Calendar or Outlook)
- **AND** MUST explain the benefit: "I can tailor your briefings to your upcoming meetings — know who you're meeting and what they care about before you walk in"
- **AND** MUST allow the user to skip this step

#### Scenario: Step 6 — Profile complete

- **WHEN** the user has completed or skipped calendar connection
- **THEN** a full user profile (identity + context + peers + calendar status) MUST be persisted
- **AND** the profile MUST be ready for the briefing engine
