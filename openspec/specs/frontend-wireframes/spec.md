## Purpose

Wireframe-level frontend specification for every screen in the Don't Sound Stupid application. Describes exact layouts, component hierarchies, interaction patterns, loading/empty/error states, responsive breakpoints, and micro-interactions. This is the implementation blueprint for the UI.

## Requirements

### Requirement: Landing Page

The application MUST have a minimal, artistic landing page that establishes the product's visual identity.

#### Scenario: Landing page layout

- **WHEN** an unauthenticated user visits the root URL
- **THEN** the page MUST display:
  - Dark background with a single floating orb rendered as a pencil-sketch/line-art style animation, centered, with gentle ambient movement (slight drift, subtle breathing scale)
  - Product name "Don't Sound Stupid" in a clean, modern serif or geometric sans-serif, centered below the orb
  - One-line tagline underneath: "Never be the last to know."
  - Two CTA buttons centered below: "Sign Up" (primary, filled) and "Log In" (secondary, outlined)
  - No nav bar, no footer — full bleed, immersive
  - On scroll or after 3s idle: a single paragraph of value prop fades in below the buttons, max-width 480px, centered

#### Scenario: Sign up

- **WHEN** the user taps "Sign Up"
- **THEN** the system MUST present email + password fields with a "Create Account" button, plus OAuth options (Google, Microsoft) as secondary buttons
- **AND** on successful account creation, MUST transition directly into the onboarding flow

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
  - Sidebar sections: Today, Archive, Knowledge, divider, Settings (with sub-items: Profile, Impress List, Delivery, Calendar)
  - Content area: centered, max-width 720px for readability, with generous padding
  - No bottom tab bar

### Requirement: Onboarding Flow Wireframe

The onboarding MUST use an orb-based visual metaphor that grows organically as the user progresses. The flow has 3 phases: orb-based immersive steps (LinkedIn, conversation, impress list), then card-based structured steps (rapid-fire, peer review, delivery, calendar).

#### Scenario: Onboarding shell layout

- Full-screen overlay (no nav bar, no tab bar — onboarding is immersive)
- Dark or deep-toned background throughout the orb phases (steps 1-3)
- No traditional progress bar during orb phases — progress is communicated by the orb growing and branching
- During card phases (steps 4-7): subtle progress indicator (dots or thin bar), light background
- Navigation: no explicit "Back" button during orb phases (flow is forward-only with a small "start over" link in corner). Card phases have standard back/continue navigation.

#### Scenario: Step 1 — Who Are You (LinkedIn URL)

- A single floating orb centered on screen, rendered in a pencil-sketch / line-art style with light, floaty ambient movement (gentle drift, slight rotation, breathing scale effect)
- Above the orb: "Who are you?" in 28px, light-colored, centered
- Below the orb: a single text input with placeholder "Paste your LinkedIn profile URL" — the input MUST feel like it belongs to the orb (e.g., a translucent field that glows softly on focus)
- A "Next" button below the input, disabled until a valid LinkedIn URL is entered
- URL validation on blur — invalid URLs show a subtle red glow on the input, no harsh error messages
- On submit: the orb pulses and swirls briefly ("Looking you up..."), then on success the user's LinkedIn photo fades into the center of the orb with their name appearing briefly, auto-advance after 1.5s

#### Scenario: Step 2 — What Do You Really Do (Conversation)

- The first orb remains visible but drifts upward and shrinks slightly
- A tendril of sketched lines bursts out from the bottom of the first orb, reaching downward, and a new, larger orb sprouts below — animated entrance, 600-800ms
- Inside or above the new orb: "Tell me what you really do." in 24px. Below in 16px muted: "No titles and BS. No generalities. What do you do all day? What's the world of content you live in?"
- Input area below the orb: a large free-text area (min 4 lines visible, expandable) with a microphone button to the right
- A subtle recommendation line near the mic: "We recommend voice — people tend to share more."
- **Voice recording state**: when the microphone is tapped, the orb MUST pulse and breathe rhythmically to show it's listening (scale oscillation synced roughly to audio amplitude). The mic button becomes a "Stop" button (filled red circle). Live transcript text streams below the orb as the user speaks
- **Voice stopped**: orb settles back to idle animation, transcript is shown in the text area for review/editing
- **Text input state**: the orb has gentle idle animation. Text appears in the free-text area normally
- A "Next" button below, enabled once transcript/text has content (min 20 characters)

#### Scenario: Step 3 — Who Do We Need to Impress (Impress List)

- The two existing orbs (user + work) remain visible, drifted up and scaled down, connected by their tendril
- The user's LinkedIn photo is now visible floating inside the top orb
- Below the second orb: multiple smaller greyed-out orbs sprout, connected to the main cluster by thin sketched connection lines — these represent the impress list contacts
- Each small orb has a greyed-out avatar silhouette and a "+" icon
- Above the cluster: "Who do we need to impress?" in 24px
- Tapping a "+" orb opens a minimal input: "Paste their LinkedIn URL" with an "Add" button
- On successful add: the greyed-out orb fills with the contact's LinkedIn photo (fetched via enrichment), their name appears below the orb briefly
- Already-added orbs show the contact photo + a small "×" to remove
- Min 1 contact required. "Next" button enabled once at least 1 is added
- "Anyone else? You can always add more later." in 14px muted text below

#### Scenario: Step 3 → Step 4 transition

- The orb cluster fades and shrinks toward the top of the screen, then dissolves
- Background transitions from dark to light (400ms crossfade)
- Card-based UI slides in from the bottom

#### Scenario: Step 4 — Rapid-Fire Clarification

- Background: light, clean. Centered content, max-width 480px
- Processing state (before topics are ready): a minimal spinner or pulsing dot animation with "Analyzing what you told me..." text. The system is parsing the conversation transcript via LLM to extract topics/entities
- Once topics are ready: topics appear one at a time as cards, centered
- Each card shows: topic name (18px bold), one-line context below (14px muted, e.g., "extracted from your description")
- Three large tap-target buttons below each card:
  - Left: "Not relevant" (muted, with left-swipe gesture on mobile)
  - Center: "Need more" (accent color)
  - Right: "Know tons" (filled, with right-swipe gesture on mobile)
- On selection: card animates out (slides in direction of choice — left for not relevant, right for know tons, fade for need more), next card slides in
- Progress: "3 of 12" counter in top-right corner
- Should feel fast and snappy — Tinder-for-topics energy
- After all topics classified: auto-advance to next step

#### Scenario: Step 5 — Peer Org Review

- Card-based layout, light background
- Loading state: skeleton cards with shimmer, "Finding organizations like yours..." text
- Once loaded: list of org cards, each showing: org name (16px bold), one-line description (14px), domain URL (12px muted)
- Per card: "Yes" (green) and "No" (red) buttons, optional comment field that expands on tap
- "Add an org we missed" link at bottom — opens inline input for org name + optional domain
- All orgs MUST be reviewed before "Continue" is enabled

#### Scenario: Step 6 — Delivery Preferences

- Card-based layout
- Channel selection: 4 icon cards in a 2×2 grid (Email, Slack, SMS, WhatsApp). Selected = accent border + check
- Channel-specific config fields appear below the grid on selection (e.g., email address, Slack workspace URL)
- Time picker: scrollable time selector with timezone auto-detected (editable)
- Button text: "Start My Briefings"

#### Scenario: Step 7 — Calendar Connect

- Card-based layout
- Two large OAuth cards (Google Calendar, Outlook) with provider logos
- On connect: success state with provider name and green check
- "Skip for now" link below — clearly not penalized

#### Scenario: Completion

- Animated checkmark (Lottie or CSS), "You're all set" headline
- Brief summary: "I know who you are, what you do, who matters to you, and what you need to stay sharp on."
- "Go to Your Dashboard" primary CTA

### Requirement: Briefing Reader Wireframe

The briefing reader MUST be the home screen. It displays exactly 5 bullet-point items, each with a reason pre-title, 1-2 sentence body, and a source link. No sections, no headers, no hierarchy — just a clean list.

#### Scenario: Briefing loaded state

- Date at the top (e.g., "Monday, February 23") — sticky on scroll
- 5 items displayed as a vertical list with generous spacing between items
- Each item consists of:
  - **Reason label**: small caps or muted 12px text above the body (e.g., "PEOPLE ARE TALKING", "BECAUSE YOU'RE MEETING SARAH CHEN", "NEW TERM IN YOUR SPACE")
  - **Body**: 15-16px body text, 1-2 sentences, dry and factual
  - **Source link**: 12px muted, clickable, showing the source name (e.g., "TechCrunch" or "arXiv") — tapping opens the source URL
  - **Action row**: 3 small icon buttons inline at the bottom-right of each item: "Tell me more" (expand icon), thumbs up (more of this), thumbs down (less of this)
- No visible scores, no priority badges, no urgency indicators — the order itself communicates priority silently
- Footer: generation timestamp in muted text

#### Scenario: Tell me more (deep dive)

- Tapping "Tell me more" expands the item inline (300ms ease-out)
- Expanded view shows: full context paragraph, list of related source URLs, "I already knew this" dismissal button
- Deep-dive content is fetched on demand (skeleton loading while generating)

#### Scenario: Feedback response

- 200ms button animation to filled state. Toast notification (2s auto-dismiss): "Got it, more of this" or "Noted, dialing this back"
- "I already knew this": item fades to 50% opacity, collapses after 1s

#### Scenario: Loading state

- 5 skeleton items with shimmer, matching the item layout (reason line + body lines + source line)
- "Loading your briefing..." text centered above

#### Scenario: First briefing pending

- Clean, minimal screen. "Your first briefing arrives at [time]." with the user's configured delivery time. Progress steps in muted text: analyzing profile, scanning sources, building knowledge graph.

### Requirement: Zero-Briefing View Wireframe

- Calm illustration. "Nothing new today that you don't already know." Subtitle with filtered count. Expansion cards (topic, rationale, signal count, "Start tracking" / "Not interested" buttons). Toast on accept.

### Requirement: Settings Screens Wireframe

- Mobile: settings list with section name, subtitle, chevron. Desktop: sidebar sub-items.
- Context: free-text area for updating work description (same voice/text input as onboarding), sticky save button. Previous conversation transcript shown for reference.
- Impress List: grouped by tier (Core/Calendar/Added), contact cards with photo/name/title/source, add FAB.

### Requirement: Knowledge Graph Viewer Wireframe

- Summary bar: total entity count + type breakdown chips. Filter chips (scrollable). Search input. Entity list grouped by type: name, type badge, confidence bar, source label, known-since date. Swipe/hover to remove. "Add Entity" button.

### Requirement: Pipeline History Wireframe

- Reverse-chronological delivery list. Each entry: date, status dot (green/red), channel icon, signal counts. Expandable: stage timing, outcomes (check/warning/X), link to briefing. Failed entries: red border, retry button.
