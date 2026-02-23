# frontend-scaffold Specification

## Purpose

The Frontend Scaffold defines the UI component structure and page model for the Don't Sound Stupid personalized intelligence briefing system. It covers the complete user-facing application: a multi-step onboarding wizard that builds user profiles, a daily briefing reader with inline feedback controls (tell me more, more/less of this, I already knew this), profile settings for managing context and preferences, a knowledge graph viewer for transparency into what the system thinks the user knows, a pipeline history view for delivery tracking, and a zero-briefing experience with interest expansion suggestions. Built with React + Next.js (App Router) and Tailwind CSS, mobile-first responsive design.

## Requirements

### Requirement: Onboarding Wizard

The frontend MUST provide a multi-step onboarding wizard that guides new users through profile creation.

#### Scenario: LinkedIn URL input step

- **WHEN** a new user begins onboarding
- **THEN** the wizard MUST present a LinkedIn URL input as the first step
- **AND** MUST validate the URL format before proceeding
- **AND** MUST show a loading state while enrichment runs

#### Scenario: Impress list step

- **WHEN** the user completes the LinkedIn step
- **THEN** the wizard MUST present an impress list builder where the user can add multiple LinkedIn URLs
- **AND** MUST explain the purpose: "Who do you want to impress? Boss, board members, investors, clients, mentors — anyone whose opinion matters"
- **AND** MUST allow adding and removing entries before proceeding

#### Scenario: Context and initiatives step

- **WHEN** the user completes the impress list step
- **THEN** the wizard MUST present a conversational context form covering current initiatives, concerns, topics to stay sharp on, and knowledge gaps
- **AND** MUST allow free-text input for each context area

#### Scenario: Delivery preferences step

- **WHEN** the user completes the context step
- **THEN** the wizard MUST present delivery preference selection: channel (email, Slack, SMS, WhatsApp), preferred time, timezone, and format (concise, standard, detailed)

#### Scenario: Calendar connect step

- **WHEN** the user completes the delivery preferences step
- **THEN** the wizard MUST offer calendar connection (Google Calendar, Outlook)
- **AND** MUST allow skipping this step
- **AND** MUST show connection status (connected/disconnected) after OAuth flow

#### Scenario: Intelligence goals step

- **WHEN** the user completes the calendar step
- **THEN** the wizard MUST present predefined intelligence goal categories (industry-trends, new-jargon, new-entrants, best-practices, research, regulatory, competitive-intelligence, network-intelligence)
- **AND** MUST allow selecting multiple categories and adding custom goals
- **AND** MUST allow free-text detail per goal

#### Scenario: Peer organization review step

- **WHEN** the user completes the intelligence goals step
- **THEN** the wizard MUST present system-suggested peer organizations for confirmation
- **AND** MUST allow confirming or rejecting each suggestion
- **AND** MUST allow adding organizations the system missed
- **AND** MUST allow an optional comment per organization

#### Scenario: Wizard progress and navigation

- **WHEN** the user is in any wizard step
- **THEN** the wizard MUST show a progress indicator with completed, current, and remaining steps
- **AND** MUST allow navigating back to previously completed steps
- **AND** MUST preserve entered data when navigating between steps

### Requirement: Briefing Reader

The frontend MUST provide a daily briefing view for consuming intelligence.

#### Scenario: Briefing section display

- **WHEN** a user opens their daily briefing
- **THEN** the reader MUST display briefing sections with titles and content
- **AND** MUST show meeting prep sections at the top when present
- **AND** MUST show the briefing generation timestamp

#### Scenario: Tell me more interaction

- **WHEN** a user clicks "tell me more" on a briefing section
- **THEN** the reader MUST expand the section with deeper context, source details, and related signals
- **AND** MUST record the interaction as a deep-dive feedback signal

#### Scenario: More/less of this controls

- **WHEN** a user clicks "more of this" or "less of this" on a briefing item
- **THEN** the reader MUST record the appropriate tune-more or tune-less feedback signal
- **AND** MUST show a brief acknowledgment ("Got it, I'll show you more/less of this")

#### Scenario: Already knew this dismiss

- **WHEN** a user clicks "I already knew this" on a briefing item
- **THEN** the reader MUST record a not-novel feedback signal
- **AND** MUST visually dim or collapse the item

### Requirement: Profile Settings

The frontend MUST provide a settings view for managing user profile configuration.

#### Scenario: Context editing

- **WHEN** a user opens profile settings
- **THEN** the settings view MUST display current initiatives, concerns, topics, and knowledge gaps
- **AND** MUST allow editing, adding, and removing entries for each context area

#### Scenario: Impress list management

- **WHEN** a user views their impress list in settings
- **THEN** the settings view MUST display all core and temporary contacts with their enriched details
- **AND** MUST allow adding new contacts and removing existing ones
- **AND** MUST show each contact's source (onboarding, user-added, promoted-from-calendar)

#### Scenario: Delivery preferences editing

- **WHEN** a user opens delivery preferences in settings
- **THEN** the settings view MUST allow changing delivery channel, preferred time, timezone, and format
- **AND** MUST validate inputs before saving

#### Scenario: Calendar connection management

- **WHEN** a user views calendar settings
- **THEN** the settings view MUST show current connection status and provider
- **AND** MUST allow connecting, disconnecting, and re-authenticating

#### Scenario: Intelligence goals editing

- **WHEN** a user views intelligence goals in settings
- **THEN** the settings view MUST display all goals with category and detail
- **AND** MUST allow adding, editing, and deactivating goals

### Requirement: Knowledge Graph Viewer

The frontend MUST provide a transparency view showing what the system thinks the user already knows.

#### Scenario: Entity display

- **WHEN** a user opens the knowledge graph viewer
- **THEN** the viewer MUST display known entities grouped by type (company, person, concept, term, product, event, fact)
- **AND** MUST show confidence level and when the entity was first known
- **AND** MUST show the source of knowledge (profile-derived, industry-scan, briefing-delivered, deep-dive, feedback-implicit)

#### Scenario: Manual entity management

- **WHEN** a user views the knowledge graph
- **THEN** the viewer MUST allow manually adding new entities the user already knows about
- **AND** MUST allow removing entities the system incorrectly thinks the user knows
- **AND** changes MUST immediately affect novelty scoring for future briefings

### Requirement: Pipeline History

The frontend MUST provide a lightweight admin view of past briefing deliveries and pipeline runs.

#### Scenario: Delivery history display

- **WHEN** a user opens the pipeline history view
- **THEN** the view MUST display past briefing deliveries with timestamps, channel used, and delivery status
- **AND** MUST allow viewing past briefing content

#### Scenario: Pipeline run status

- **WHEN** a user views pipeline history
- **THEN** the view MUST show pipeline run status (scheduled, running, completed, partial-failure, failed)
- **AND** MUST display stage-level results for each run (ingestion, scoring, novelty-filtering, composition, delivery, knowledge-update)

### Requirement: Zero-Briefing View

The frontend MUST handle the case when no new intelligence is available.

#### Scenario: Nothing new today display

- **WHEN** a user's daily briefing has zero novel items
- **THEN** the frontend MUST display a "Nothing new today" message with the system's refinement prompt
- **AND** MUST show the count of signals that were filtered out

#### Scenario: Interest expansion suggestions

- **WHEN** a zero-briefing is displayed
- **THEN** the view MUST present suggested interest expansions with topic area and rationale
- **AND** MUST provide accept/reject controls for each suggestion
- **AND** accepting a suggestion MUST add it to the user's intelligence goals or topics

### Requirement: Mobile-First Responsive Design

The frontend MUST be designed mobile-first since briefings are primarily consumed on phones.

#### Scenario: Mobile viewport

- **WHEN** the frontend is rendered on a mobile device (viewport < 768px)
- **THEN** all views MUST be fully functional with touch-friendly controls
- **AND** briefing content MUST be readable without horizontal scrolling
- **AND** interaction controls (more/less, tell me more, dismiss) MUST have adequate touch targets (minimum 44px)

#### Scenario: Desktop viewport

- **WHEN** the frontend is rendered on desktop (viewport >= 1024px)
- **THEN** the layout MUST adapt to use available space without excessive whitespace
- **AND** navigation MUST transition from bottom tabs to a sidebar

### Requirement: Theme Support

The frontend MUST support light, dark, and system-matched theme preferences.

#### Scenario: Theme selection

- **WHEN** a user selects a theme preference (light, dark, or system)
- **THEN** the frontend MUST apply the selected theme immediately
- **AND** MUST persist the preference across sessions
- **AND** "system" MUST follow the OS-level dark mode preference
