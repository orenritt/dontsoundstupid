# relevance-scoring Specification

## Purpose

The Relevance Scoring Engine selects the most valuable candidate signals for a user's personalized briefing using an agent-based approach. Rather than computing a weighted formula of independent factors, an LLM agent evaluates the full candidate pool holistically — reasoning across the user's profile, knowledge graph, feedback history, peer context, and signal freshness to select the top N signals. The agent has access to tools that let it investigate deeper before making its final selection, producing transparent reasoning and an auditable tool-call log.

## Architecture

The scoring engine operates as a two-stage pipeline:

1. **Candidate generation** — Upstream ingestion layers produce 15-25 candidate signals per briefing cycle. These are passed to the scoring agent as-is (no pre-filtering by cosine similarity).

2. **Agent selection** — An LLM agent receives the full candidate pool alongside the user's complete profile context. Its first action is always to check for upcoming meetings — meeting-relevant signals are the highest priority. It then reasons about novelty, relevance, momentum, coherence, diversity, and feedback alignment. It has access to 13 tools for deeper analysis: knowledge graph lookup, feedback history, peer comparison, provenance lookup, freshness assessment, web search, Google Trends, today's meetings, meeting attendee research, briefing history search, signal cross-referencing, and expertise gap analysis. It then submits its top N selections with per-signal reasoning.

## Requirements

### Requirement: Agent-Based Signal Selection

The system MUST use an LLM agent to select top signals from the candidate pool.

#### Scenario: Agent evaluates candidates

- **WHEN** a scoring run is initiated for a user
- **THEN** the system MUST present all candidate signals to an LLM agent alongside the user's full profile context (role, company, topics, initiatives, concerns, knowledge gaps, expertise areas, rapid-fire classifications)
- **AND** the agent MUST select the configured number of top signals (default: 5)
- **AND** the agent MUST provide a reason type and human-readable reason label for each selection

#### Scenario: Agent selection criteria

- **WHEN** the agent evaluates candidates
- **THEN** the agent MUST consider (in priority order): meeting prep (signals relevant to today's meetings are highest priority), novelty to the user, relevance to their role and concerns (including expertise gaps), momentum (whether the topic is gaining or losing public attention), coherence across selections (compound narratives, deduplication), topic diversity, and alignment with past feedback
- **AND** the agent MUST NOT select signals the user already knows about unless the development is genuinely new

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

### Requirement: Meeting-Aware Scoring Priority

The system MUST treat upcoming meetings as a high-priority scoring signal, subject to attendee intelligence and a hard cap on meeting-prep slots.

#### Scenario: Agent checks meetings first

- **WHEN** a scoring run begins
- **THEN** the agent MUST call `check_today_meetings` as its first tool action
- **AND** if prep-worthy meetings are found, MUST call `research_meeting_attendees` for each one before evaluating other criteria

#### Scenario: Attendee prioritization hierarchy

- **WHEN** the system classifies meeting attendees for prep worthiness
- **THEN** attendees on the user's impress list MUST receive "high" prep priority
- **AND** senior internal people (C-suite, VPs, directors, founders, partners within the user's company) MUST receive "high" prep priority
- **AND** senior external people MUST receive "medium" prep priority
- **AND** external non-junior people MUST receive "medium" prep priority
- **AND** junior staff (interns, analysts, coordinators, assistants) MUST receive "low" prep priority and MUST NOT be researched
- **AND** the system MUST NOT waste LLM research calls on low-priority attendees

#### Scenario: Recurring meeting detection

- **WHEN** a meeting title has appeared more than twice in the past 30 days
- **THEN** the system MUST flag the meeting as recurring
- **AND** recurring meetings without high-priority attendees MUST receive "skip" prep worthiness
- **AND** recurring meetings with high-priority attendees MUST receive "medium" prep worthiness (the attendees matter, even if the meeting is routine)

#### Scenario: Meeting-prep slot cap

- **WHEN** the user has prep-worthy meetings today
- **THEN** meeting-prep signals MUST use AT MOST 3 of the target selection slots (e.g., 3 of 5)
- **AND** the remaining slots MUST be filled with the best non-meeting signals using the standard criteria
- **AND** the agent MUST NOT fill all slots with meeting prep — the user needs a balanced briefing

#### Scenario: No meetings today

- **WHEN** the user has no meetings scheduled
- **THEN** the agent MUST proceed with standard selection criteria (novelty, relevance, momentum, etc.)
- **AND** the meeting-prep reason type MUST NOT be used

### Requirement: Agent Tool Loop

The system MUST support a multi-round tool-calling loop with a configurable maximum.

#### Scenario: Tool round limit

- **WHEN** the agent is executing
- **THEN** the system MUST allow up to `maxToolRounds` (default: 10) rounds of tool calls before requiring a final submission
- **AND** if the agent exhausts all rounds without submitting, the system MUST force a final selection

#### Scenario: Tool call logging

- **WHEN** the agent calls any tool
- **THEN** the system MUST log the tool name, arguments, and a summary of the result
- **AND** the complete tool call log MUST be included in the scoring result for auditability

### Requirement: Selection Output

The system MUST produce structured selection output with per-signal reasoning.

#### Scenario: Selection structure

- **WHEN** the agent submits its final selections
- **THEN** each selection MUST include: signal index, reason type (from the standard set), human-readable reason label, confidence score (0-1), novelty assessment, and list of tools used during evaluation

#### Scenario: Reason types

- **WHEN** the agent assigns a reason to a selection
- **THEN** the reason MUST be one of: meeting-prep, people-are-talking, new-entrant, fundraise-or-deal, regulatory-or-policy, term-emerging, network-activity, your-space, competitive-move, event-upcoming, other
- **AND** the agent MUST use "meeting-prep" for any signal selected because of its relevance to an upcoming meeting
- **AND** meeting-prep reason labels MUST be specific (e.g., "Because you're meeting Sarah Chen at 2pm" not just "Meeting prep")

### Requirement: Scoring Configuration

The system MUST support configurable agent parameters.

#### Scenario: Config applied

- **WHEN** a scoring run is initiated
- **THEN** the system MUST use the configured model, temperature, max tool rounds, target selection count, and candidate pool size
- **AND** MUST record which model was used in the scoring result

### Requirement: Reasoning Transparency

The system MUST capture the agent's full reasoning chain.

#### Scenario: Reasoning recorded

- **WHEN** a scoring run completes
- **THEN** the system MUST record all assistant messages from the agent conversation as the reasoning chain
- **AND** MUST record total prompt and completion token counts across all agent rounds
