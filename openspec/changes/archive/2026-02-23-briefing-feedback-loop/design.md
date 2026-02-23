## Context

The briefing is currently a one-way broadcast. Users receive information but have no way to react to it — either to go deeper or to shape future briefings. This change makes the channel bidirectional, enabling two interaction modes: immediate deep-dives and gradual relevance tuning.

## Goals / Non-Goals

**Goals:**
- Define the data model for briefing items (with stable IDs), interactions, and feedback signals
- Define types for deep-dive requests and responses
- Define types for relevance tuning (more/less) with gradual, not absolute, effect
- Add feedback history to the user profile context layer
- Keep the interaction model channel-agnostic (works over email reply, Slack message, SMS, WhatsApp)

**Non-Goals:**
- Building the actual briefing generation engine
- Implementing channel-specific reply parsing (email reply handling, Slack message parsing, etc.)
- Building the relevance weighting algorithm
- NLP/intent classification for user messages (future — for now, structured interaction types)

## Decisions

### Decision 1: Briefing items as a first-class type with stable IDs

Each briefing item gets a UUID. This is necessary for feedback to reference specific items. The briefing itself is a collection of items, each tagged with topic, category, and source metadata. This metadata is what tuning feedback operates on — not just the item itself but the class of content it represents.

### Decision 2: Feedback as weighted signals, not binary switches

Tuning feedback is stored as individual signal events (topic + direction + timestamp), not as a toggle. Multiple "less of this" signals on the same topic progressively reduce its weight. A single negative signal doesn't kill a topic — the user might still need to see critical developments. This avoids the "I said no once and now I'm blind to an entire category" problem. Recent signals weigh more than old ones (time decay).

### Decision 3: Deep-dive requests are also positive signals

When a user asks "tell me more" about something, that's an implicit "I care about this." Deep-dive requests are recorded as positive interest signals alongside explicit tuning feedback. This means the system learns passively from curiosity, not just from explicit "more/less" commands.

### Decision 4: Interaction model is channel-agnostic

The interaction types (deep-dive, tune-more, tune-less) are abstract. Channel-specific parsing (how to detect intent from an email reply vs a Slack reaction vs an SMS) is a separate concern handled by channel adapters. The feedback model just stores structured interaction events.

### Decision 5: Feedback stored in context layer, not a separate store

Feedback history lives inside the user profile's context layer. This keeps it alongside intelligence goals, initiatives, and concerns — all the dynamic data that shapes briefing relevance. It also means feedback is captured in context snapshots when the context evolves.

## Risks / Trade-offs

- **Feedback volume** — Active users could generate a lot of feedback events. Mitigation: time-decay weighting means old signals naturally lose influence; periodic compaction can summarize old signals.
- **Intent ambiguity** — A user reply might be unclear ("interesting" — is that deep-dive or positive tuning?). Mitigation: for now, require structured interaction types; NLP intent classification is a future enhancement.
- **Over-fitting** — Too much tuning could narrow briefings to an echo chamber. Mitigation: gradual tuning (not absolute) and periodic "discovery" items that surface content outside the user's usual scope.
