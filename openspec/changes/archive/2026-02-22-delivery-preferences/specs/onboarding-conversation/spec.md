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

#### Scenario: Step 5 — Delivery preferences

- **WHEN** the user has confirmed/rejected peer organizations
- **THEN** the system MUST ask "Where should I send your daily briefing?" and present channel options (email, Slack, SMS, WhatsApp)
- **AND** MUST collect channel-specific configuration (e.g., email address, phone number)
- **AND** MUST ask "What time works best?" and collect preferred delivery time and timezone
- **AND** MUST ask "How detailed?" and present format options (concise, standard, detailed)

#### Scenario: Step 6 — Profile complete

- **WHEN** the user has selected delivery preferences
- **THEN** a full user profile (identity + context + peers + delivery preferences) MUST be persisted
- **AND** the profile MUST be ready for the briefing engine
