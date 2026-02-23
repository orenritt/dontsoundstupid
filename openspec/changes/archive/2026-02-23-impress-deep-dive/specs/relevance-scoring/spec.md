## MODIFIED Requirements

### Requirement: Agent Tools

The system MUST provide the scoring agent with tools for deeper analysis.

#### Scenario: Knowledge graph lookup

- **WHEN** the agent calls `check_knowledge_graph`
- **THEN** the system MUST query the user's knowledge entities and return matching entities with confidence levels
- **AND** MUST support both text-based and embedding-based matching

#### Scenario: Feedback history lookup

- **WHEN** the agent calls `check_feedback_history`
- **THEN** the system MUST return the user's recent feedback signals grouped by type (tune-more, tune-less, not-novel, deep-dive)
- **AND** the agent MUST honor these signals when making selections

#### Scenario: Peer comparison

- **WHEN** the agent calls `compare_with_peers`
- **THEN** the system MUST check candidate signals against the user's tracked peer organizations and impress-list contacts
- **AND** MUST return which signals mention tracked entities
- **AND** for impress contacts with completed deep-dive research, MUST return the contact's interests, focus areas, and talking points alongside basic identity data
- **AND** MUST check signal text against impress contact interests and focus areas in addition to contact names
- **AND** MUST indicate which specific interests or focus areas matched for each signal

#### Scenario: Freshness assessment

- **WHEN** the agent calls `assess_freshness`
- **THEN** the system MUST return the user's last briefing date and topics covered in recent briefings
- **AND** the agent MUST use this to avoid repeating recently covered topics

#### Scenario: Web search verification

- **WHEN** the agent calls `web_search`
- **THEN** the system MUST perform a search to verify or enrich a signal
- **AND** the agent SHOULD use this sparingly — only when it needs to confirm a signal is real or currently relevant

#### Scenario: Signal provenance lookup

- **WHEN** the agent calls `get_signal_provenance`
- **THEN** the system MUST return provenance records linking signals to the user's profile triggers (followed orgs, peers, impress-list, intelligence goals)
- **AND** signals with provenance type `"user-curated"` MUST receive the maximum provenance score (1.0)
- **AND** MUST include the user's annotation text in the provenance response for downstream attribution

#### Scenario: User-curated provenance elevation

- **WHEN** the agent calls `get_signal_provenance` for a signal with provenance type `"user-curated"` (from email-forward ingestion)
- **THEN** the system MUST return a provenance score of 1.0 for that signal
- **AND** MUST include the user's annotation text explaining why they forwarded the content
- **AND** the agent SHOULD treat user-curated signals as high-confidence relevance indicators since the user explicitly flagged the content as interesting

#### Scenario: Google Trends momentum analysis

- **WHEN** the agent calls `query_google_trends`
- **THEN** the system MUST query Google Trends for the specified keywords (up to 5) over the specified timeframe
- **AND** MUST return per-keyword interest data including: average interest (0-100 scale), trend direction (rising/falling/stable), recent vs older average comparison, peak interest, and related rising queries
- **AND** the agent SHOULD use this data to assess whether a signal represents a genuinely emerging trend worth the user's attention or a declining topic
- **AND** the agent SHOULD prefer signals about rising trends over signals about stable or declining topics, all else being equal

#### Scenario: Today's meetings lookup

- **WHEN** the agent calls `check_today_meetings`
- **THEN** the system MUST query the meetings table for meetings in the user's today/tomorrow window
- **AND** MUST classify each attendee's prep priority using the attendee hierarchy (impress list > senior internal > senior external > external peer > junior/skip)
- **AND** MUST detect recurring meetings (same title >2 times in past 30 days) and flag them
- **AND** MUST classify each meeting's overall prep worthiness (high/medium/low/skip) based on attendee priorities and recurrence
- **AND** MUST return matching hints derived only from prep-worthy meetings and high/medium-priority attendees
- **AND** matching hints MUST include the hard cap instruction: at most 3 of 5 slots for meeting prep

#### Scenario: Meeting attendee research

- **WHEN** the agent calls `research_meeting_attendees`
- **THEN** the system MUST filter attendees to only research those worth researching (impress-list contacts, senior people, external non-junior people)
- **AND** MUST skip junior staff, interns, analysts, coordinators, and assistants
- **AND** MUST flag impress-list contacts with [ON IMPRESS LIST] for the LLM to prioritize
- **AND** MUST produce per-attendee profiles, meeting purpose, talking points, landmines, and signal keywords focused on the most important attendees
- **AND** MUST report how many attendees were researched vs. skipped for transparency

#### Scenario: Briefing history search

- **WHEN** the agent calls `search_briefing_history`
- **THEN** the system MUST search the user's past briefings for items matching the query
- **AND** MUST return matching items with their dates, topics, and content
- **AND** the agent SHOULD use this to avoid repeating topics already covered in recent briefings and to understand what the user has been tracking over time

#### Scenario: Signal cross-referencing

- **WHEN** the agent calls `cross_reference_signals`
- **THEN** the system MUST analyze relationships between the specified candidate signals using an LLM
- **AND** MUST identify thematic clusters, contradictions, compound narratives, and redundancies
- **AND** the agent SHOULD use redundancy flags to avoid including near-duplicate signals
- **AND** the agent SHOULD use compound narratives to prefer signal combinations that tell a bigger story together

#### Scenario: Expertise gap analysis

- **WHEN** the agent calls `check_expertise_gaps`
- **THEN** the system MUST compare candidate signals against the user's self-identified weak areas, knowledge gaps, and expert areas
- **AND** MUST classify each signal's educational value as high (fills a gap, not in an expert area), medium (fills a gap but overlaps expertise), or low (no gap relevance)
- **AND** the agent SHOULD prefer high-educational-value signals to help the user grow in areas they've identified as weaknesses
