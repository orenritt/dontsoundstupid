## Context

The frontend scaffold spec defines the screen inventory but not the visual and interaction design. This wireframe spec provides implementation-ready detail for every screen — layouts, component hierarchies, animations, states, and responsive breakpoints.

## Goals / Non-Goals

**Goals:**
- Every screen described at wireframe fidelity (layout, components, interactions, states)
- Mobile-first responsive behavior documented
- Loading, empty, and error states for all dynamic content
- Micro-interactions (animations, transitions, feedback responses)
- Component reuse patterns identified

**Non-Goals:**
- Pixel-perfect mockups or design system tokens (colors, fonts, spacing values)
- Actual component implementation code
- Accessibility audit (important but separate concern)
- Animation library selection

## Decisions

### Decision 1: Single-task onboarding screens

Each onboarding step gets its own full-screen view with one primary action. This reduces cognitive load and makes the wizard feel fast even though it has 8 steps. Cards animate in sequentially within multi-question steps.

### Decision 2: Briefing reader as home screen

The briefing reader (/briefing) is the default landing page after onboarding. This matches the product's daily ritual — open the app, read your briefing, give feedback, close.

### Decision 3: Bottom tabs on mobile, sidebar on desktop

Mobile uses a 4-tab bottom bar (Today, Archive, Knowledge, Settings). Desktop uses a collapsible left sidebar with section hierarchy. This follows platform conventions and maximizes content area.

### Decision 4: Inline feedback with toast confirmation

Feedback buttons (more, less, not novel) stay inline in the card rather than opening modals. Toasts provide confirmation without interrupting reading flow. This optimizes for quick, low-friction feedback during briefing consumption.

### Decision 5: Knowledge graph as a trust-building feature

The knowledge graph viewer is not an admin tool — it's a transparency feature. "Here's what I think you know" builds user trust and gives them control to correct the system. The summary bar and filters make a potentially overwhelming entity list navigable.

## Risks / Trade-offs

- **Onboarding length** — 8 steps is on the longer side. Mitigation: each step is fast (single input, pre-filled where possible, animated transitions make it feel snappy), and the value prop is clear at each step.
- **Information density vs. readability** — briefing cards need to be information-dense but scannable. Mitigation: truncation with "Read more", clear hierarchy (title > content > source > actions), generous vertical spacing.
