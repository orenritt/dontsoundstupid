## ADDED Requirements

### Requirement: Global Layout and Navigation

The application MUST use a consistent layout shell across all authenticated screens.

#### Scenario: Mobile layout (< 768px)

- **WHEN** rendered on mobile
- **THEN** the layout MUST consist of:
  - Top bar: product logo ("DSS" mark) left-aligned, user avatar right-aligned (tapping opens settings)
  - Content area: full-width, scrollable
  - Bottom tab bar: 4 tabs — Today (briefing icon), Archive (clock icon), Knowledge (brain icon), Settings (gear icon)
  - Active tab MUST be visually highlighted with a filled icon and accent underline
  - Tab bar MUST be fixed at viewport bottom, 56px height, with safe area insets on notched devices

#### Scenario: Desktop layout (>= 1024px)

- **WHEN** rendered on desktop
- **THEN** the layout MUST consist of:
  - Left sidebar: 240px width, collapsible to 64px icon-only mode
  - Sidebar sections: Today, Archive, Knowledge, divider, Settings (with sub-items: Profile, Impress List, Delivery, Calendar, Goals, Expertise)
  - Content area: centered, max-width 720px for readability, with generous padding
  - No bottom tab bar

### Requirement: Onboarding Wizard Wireframe

The onboarding wizard MUST follow a focused, single-task-per-screen design.

#### Scenario: Wizard shell layout

- **WHEN** the user is in the onboarding flow
- **THEN** the screen MUST show:
  - Full-screen overlay (no nav bar, no tab bar — onboarding is immersive)
  - Progress bar: horizontal, segmented (8 segments for 8 steps), filled segments for completed steps, current segment pulsing
  - Step title: large (24px), bold, centered above the form area
  - Step prompt: body text (16px), max-width 480px, centered, explaining what's needed
  - Form area: centered, max-width 480px
  - Navigation: "Back" (text button, left) and "Continue" (primary button, right) at bottom. Continue disabled until valid input. Back hidden on first step.
  - On mobile: form area is full-width with 16px horizontal padding

#### Scenario: Step 1 — LinkedIn URL

- **WHEN** on the LinkedIn URL step
- **THEN** the form MUST show:
  - Single text input with placeholder "https://linkedin.com/in/yourname"
  - URL format validation on blur (must match linkedin.com/in/ pattern)
  - On submit: loading spinner replaces Continue button, text changes to "Looking you up..."
  - On success: brief flash of enriched name + title + photo below input, then auto-advance after 1.5s

#### Scenario: Step 2 — Impress List

- **WHEN** on the impress list step
- **THEN** the form MUST show:
  - Text input for adding LinkedIn URLs, with "Add" button
  - List of added URLs below, each showing: enriched name + title (if available), remove (X) button
  - Minimum 1 entry required before Continue activates
  - Empty state text: "Add at least one person you want to impress"

#### Scenario: Step 3 — Context and Initiatives

- **WHEN** on the context step
- **THEN** the form MUST show a conversational card layout:
  - 4 sequential cards, each with a question and a multi-line text area:
    - Card 1: "What are you working on right now?" (initiatives)
    - Card 2: "What keeps you up at night?" (concerns)
    - Card 3: "What topics do you need to stay sharp on?" (topics — comma-separated tag input)
    - Card 4: "What would embarrass you to not know?" (knowledge gaps)
  - Cards animate in one at a time as the user completes each (slide up + fade)
  - All 4 must have content before Continue activates

#### Scenario: Step 4 — Intelligence Goals

- **WHEN** on the intelligence goals step
- **THEN** the form MUST show:
  - Grid of selectable category chips (2 columns on mobile, 3 on desktop):
    - Industry Trends, New Jargon, New Entrants, Best Practices, Research, Regulatory, Competitive Intel, Network Intel
  - Each chip: rounded rectangle, label + subtle icon, toggles selected/unselected on tap
  - Selected state: filled background (accent color), white text
  - "Add Custom" chip at the end opens a text input inline
  - Optional detail field appears below each selected chip (collapsed by default, expand on tap)
  - At least 1 goal must be selected before Continue activates

#### Scenario: Step 5 — Self-Assessment

- **WHEN** on the self-assessment step
- **THEN** the form MUST show:
  - One row per selected intelligence goal from previous step
  - Each row: category name (left), 4-button segmented control (right) with levels: Novice, Developing, Proficient, Expert
  - Default selection: Proficient (safe middle ground)
  - Below the segmented control, a subtle one-line explainer that updates per selection:
    - Novice: "I'll teach you the basics and flag everything"
    - Developing: "I'll include foundational context with updates"
    - Proficient: "I'll focus on what's new and developing"
    - Expert: "I'll only surface genuinely surprising developments"
  - All categories must be assessed before Continue activates

#### Scenario: Step 6 — Peer Organization Review

- **WHEN** on the peer review step
- **THEN** the form MUST show:
  - Loading state: "Researching organizations similar to yours..." with animated dots
  - Once loaded: vertical list of suggested peer orgs, each showing:
    - Organization name (bold), one-line description, domain
    - Two-button row: "Yes, relevant" (green outline), "Not relevant" (red outline)
    - Optional comment field (appears on tap of either button)
  - "Add an org we missed" button at bottom opens inline form (name + domain)
  - All suggestions must be reviewed (yes/no) before Continue activates

#### Scenario: Step 7 — Calendar Connect

- **WHEN** on the calendar connect step
- **THEN** the form MUST show:
  - Two large card buttons side by side:
    - Google Calendar: Google logo, "Connect Google Calendar"
    - Outlook: Microsoft logo, "Connect Outlook Calendar"
  - Clicking either initiates OAuth flow (opens popup/redirect)
  - Success state: green checkmark, "Connected to [provider]", with "Disconnect" link
  - "Skip for now" text link below the cards (right-aligned)
  - Continue activates after either connecting or skipping

#### Scenario: Step 8 — Delivery Preferences

- **WHEN** on the delivery preferences step
- **THEN** the form MUST show:
  - Channel selection: 4 icon cards in a row (Email, Slack, SMS, WhatsApp), select one
  - Selected card shows channel-specific config below:
    - Email: email address input (pre-filled from profile if available)
    - Slack: workspace name + channel name inputs
    - SMS: phone number input with country code selector
    - WhatsApp: phone number input with country code selector
  - Time picker: "When should I send your briefing?" — hour/minute selector with AM/PM
  - Timezone: auto-detected from browser, editable dropdown
  - Format: 3 radio cards — Concise ("3-5 bullets, 30 seconds"), Standard ("Structured summary, 2 minutes"), Detailed ("Full analysis with sources, 5 minutes")
  - Continue button text changes to "Start My Briefings"

#### Scenario: Completion screen

- **WHEN** the user completes all onboarding steps
- **THEN** the screen MUST show:
  - Animated checkmark (Lottie or CSS animation)
  - "You're all set." headline
  - Summary: "I know who you are, who you impress, what you're working on, and where your knowledge gaps are. Your first briefing arrives [time]."
  - Single CTA button: "Go to Dashboard" — navigates to /briefing

### Requirement: Briefing Reader Wireframe

The briefing reader MUST be the home screen and primary interaction surface.

#### Scenario: Briefing loaded state

- **WHEN** the daily briefing is available
- **THEN** the reader MUST show:
  - Date header: "Today, February 23, 2026" — sticky at top on scroll
  - If meeting prep sections exist: a "Meeting Prep" header with a calendar icon, followed by meeting prep section cards (visually distinct with left accent border in blue)
  - Each meeting prep card: meeting title, time, attendee names, then talking points as bullet list
  - Divider line
  - Main briefing sections in a vertical card list, each card containing:
    - Section title (18px, bold)
    - Section content (16px, body text, max 4 lines before truncation with "Read more")
    - Source attribution: "[Layer icon] from [source name]" in muted text (12px)
    - Action row: 3 icon buttons inline — "Tell me more" (expand icon), thumbs up (more of this), thumbs down (less of this), X (I already knew this)
  - Briefing metadata footer: "Generated at [time] | [X] signals analyzed | [Y] filtered by novelty"

#### Scenario: Section expanded (tell me more)

- **WHEN** the user taps "tell me more" on a section
- **THEN** the card MUST expand smoothly (300ms ease-out) to show:
  - Full content (no truncation)
  - "Sources" sub-section with linked source URLs
  - Related signals list: compact list of related signal titles that contributed
  - "Deep Dive" button: triggers a deep-dive request that returns additional research
  - Deep-dive loading state: skeleton text blocks while the LLM generates the response
  - Deep-dive result: additional paragraphs appended below the sources section

#### Scenario: Feedback visual response

- **WHEN** the user taps any feedback button
- **THEN** the button MUST:
  - Animate to a filled/active state (200ms)
  - Show a brief toast notification (bottom of screen, auto-dismiss after 2s):
    - More: "Got it, I'll show you more like this"
    - Less: "Noted, I'll dial this back"
    - Not novel: "Thanks, I'll remember you know this"
  - For "not novel": the card MUST fade to 50% opacity and collapse height by 50% (can still expand)

#### Scenario: Briefing loading state

- **WHEN** the briefing is being fetched
- **THEN** the reader MUST show:
  - 3 skeleton card placeholders with animated shimmer effect
  - "Loading your briefing..." text centered above skeletons

#### Scenario: No briefing yet

- **WHEN** the user hasn't received their first briefing yet
- **THEN** the reader MUST show:
  - Illustration (simple line art of a sunrise/coffee)
  - "Your first briefing arrives at [preferred time]"
  - "We're building your intelligence profile right now."
  - Subtle progress indicator: "Analyzing your profile... Scanning industry sources... Building your knowledge graph..."

### Requirement: Zero-Briefing View Wireframe

The zero-briefing view MUST feel intentional, not broken.

#### Scenario: Nothing new today layout

- **WHEN** the novelty filter leaves zero signals
- **THEN** the view MUST show:
  - Calm, positive illustration (checkmark in a circle, or a zen garden motif)
  - Headline: "Nothing new today that you don't already know."
  - Subtitle: "We analyzed [X] signals and filtered them all — you're already on top of it."
  - Divider
  - "Expand your radar?" section header
  - Suggested expansion cards (1-3), each showing:
    - Topic area name (bold)
    - Rationale: one-line explanation ("There's activity in [topic] adjacent to your work")
    - Filtered signal count: "([N] signals in this area today)"
    - Two buttons: "Start tracking" (primary), "Not interested" (ghost)
  - Accepting an expansion MUST show a success toast and add the topic to intelligence goals

### Requirement: Settings Screens Wireframe

The settings screens MUST use a consistent list/detail pattern.

#### Scenario: Settings hub (mobile)

- **WHEN** the user taps the Settings tab on mobile
- **THEN** the screen MUST show a list of settings sections:
  - "Profile & Context" — initiatives, concerns, topics, gaps
  - "Impress List" — people you want to impress
  - "Intelligence Goals" — what you want to track
  - "Expertise Levels" — self-assessment ratings
  - "Delivery" — channel, time, format
  - "Calendar" — connection status
  - "Knowledge Graph" — what I think you know
  - Each row: section name, brief subtitle (current value summary), chevron right
  - Tapping navigates to the detail screen

#### Scenario: Settings hub (desktop)

- **WHEN** on desktop
- **THEN** the settings sections MUST appear as sidebar sub-items under Settings
- **AND** clicking a section MUST load the detail view in the main content area (no page navigation)

#### Scenario: Context editing screen

- **WHEN** the user opens Profile & Context
- **THEN** the screen MUST show 4 editable sections in a vertical stack:
  - Each section: label, current entries as removable tags/chips, "Add" button that opens inline text input
  - Save button at bottom (sticky on mobile), disabled until changes detected
  - Cancel button returns to previous state

#### Scenario: Impress List screen

- **WHEN** the user opens Impress List
- **THEN** the screen MUST show:
  - Contacts grouped by tier: "Core" (from onboarding), "Calendar" (auto-derived, temporary), "Added" (post-onboarding manual adds)
  - Each contact card: photo (if available), name, title, company, source badge, remove button
  - "Add Contact" FAB (mobile) or button (desktop) — opens LinkedIn URL input
  - Temporary (calendar) contacts show an expiry indicator

#### Scenario: Expertise Levels screen

- **WHEN** the user opens Expertise Levels
- **THEN** the screen MUST show:
  - Same layout as onboarding self-assessment step (category name + 4-level segmented control)
  - Current levels pre-selected
  - "What this means" explainer per level (same as onboarding)
  - Save button that triggers scoring override recalculation
  - "Add New Category" button at bottom if the user has added new intelligence goals since onboarding

### Requirement: Knowledge Graph Viewer Wireframe

The knowledge graph viewer MUST build trust by showing transparency.

#### Scenario: Entity list view

- **WHEN** the user opens the Knowledge Graph screen
- **THEN** the screen MUST show:
  - Summary bar: "I think you know [N] things" with entity type breakdown (chips: [X] companies, [Y] people, [Z] concepts...)
  - Filter row: horizontal scrollable chips to filter by entity type (all selected by default, tap to toggle)
  - Search input: "Search your knowledge graph..."
  - Entity list: grouped by type, each entity showing:
    - Entity name (bold), entity type badge (colored pill), confidence bar (thin horizontal bar, 0-100%)
    - Source label: "from your profile" / "industry scan" / "briefing" / "deep-dive" / "your feedback"
    - Known since date (muted text)
    - Swipe left (mobile) or hover (desktop) reveals "Remove" action
  - "Add Entity" button at top: opens a form with name, type dropdown, and description

#### Scenario: Entity detail (future)

- **WHEN** the user taps an entity
- **THEN** for MVP the entity detail MUST show an expanded inline view with:
  - Full description
  - Related entities (linked names)
  - Confidence history (when it was reinforced)
  - "Remove this" button (confirms before removing)

### Requirement: Pipeline History Wireframe

The pipeline history view MUST be a lightweight audit log.

#### Scenario: History list

- **WHEN** the user opens the History screen
- **THEN** the screen MUST show:
  - Reverse-chronological list of briefings delivered
  - Each entry: date, delivery status (green/red dot), channel icon, "X signals delivered, Y filtered"
  - Tapping an entry expands to show:
    - Pipeline run stages with timing (ingestion: 12s, scoring: 3s, etc.)
    - Stage outcomes (green check / yellow warning / red X)
    - Link to view that day's briefing content
  - Failed deliveries MUST be visually distinct (red left border, retry button)
