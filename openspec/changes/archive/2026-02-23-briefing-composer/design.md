## Context

Scored signals exist in the signal store with per-user provenance and relevance scores. User profiles carry delivery preferences (format, channel, time, timezone), context (role, initiatives, goals), and optional calendar data. The Briefing Composer is the LLM-powered layer that turns scored signals into a personalized narrative briefing and handles delivery logistics.

## Goals / Non-Goals

**Goals:**
- LLM-powered composition with configurable provider (OpenAI, Anthropic)
- Format adaptation: concise (3–5 bullets), standard (structured sections), detailed (full analysis)
- Channel-specific rendering: email HTML, Slack blocks, SMS plain text, WhatsApp markdown
- Context injection: user role, company, initiatives, concerns, intelligence goals frame the briefing
- Signal attribution: every section links back to source signal IDs for "tell me more"
- Meeting-aware briefing: prepend meeting prep when calendar sync is active
- Timezone-aware scheduling with retry logic for failed deliveries

**Non-Goals:**
- Actual email/Slack/SMS/WhatsApp send infrastructure (separate delivery service)
- Real-time briefing streaming (batch daily delivery for MVP)
- Multi-language briefing composition
- Briefing approval workflow before sending

## Decisions

### Decision 1: Prompt-based composition, not template-based

Use a full LLM prompt with user context and scored signals rather than a template with variable substitution. The LLM synthesizes signals into coherent narrative rather than slotting items into fixed templates. This produces more natural, contextually relevant briefings but requires careful prompt engineering.

### Decision 2: Composed briefing as structured sections

The LLM output is parsed into typed sections — each with a title, content body, and list of source signal IDs. This structure enables attribution tracking, format adaptation, and partial rendering (e.g., SMS may only include the top 2 sections).

### Decision 3: Delivery attempts as separate records

Each delivery try is a separate DeliveryAttempt record, not an update to the briefing itself. This maintains a full audit trail of retry attempts and allows analytics on delivery reliability per channel.

### Decision 4: Schedule table for timezone-aware triggers

A dedicated BriefingSchedule table stores the pre-computed next delivery time in UTC for each user. A scheduler job queries for schedules where `next_delivery_at <= NOW()`, triggers composition, and advances the schedule. This avoids timezone computation at trigger time.

## Risks / Trade-offs

- **LLM latency** — Composing a briefing with full context can take 5–15 seconds. Mitigation: trigger composition ahead of delivery time, cache results.
- **LLM cost** — Daily composition per user adds up. Mitigation: use smaller models for concise format, tune max tokens per format.
- **Prompt size limits** — Large signal sets may exceed context window. Mitigation: pre-rank and truncate signals to top N before prompt construction.
- **Format fidelity** — LLM-generated HTML/Slack blocks may not render perfectly. Mitigation: post-process and validate output format before delivery.
