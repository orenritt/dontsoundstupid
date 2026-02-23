## Why

The briefing channel is currently one-directional — the system sends, the user reads. But users have immediate reactions to briefing items: "Wait, what does that mean?", "Tell me more about that company", "Stop sending me hiring news." Without a feedback mechanism, the system can't learn from these reactions, and users can't go deeper when something catches their eye. The channel needs to be two-way so the system gets smarter over time and users get value in the moment.

## What Changes

- Make the briefing channel interactive — users can respond to individual briefing items
- Two interaction types:
  1. **Deep-dive ("tell me more")** — user wants immediate, expanded information on a specific briefing item. The system responds right away with deeper context, background, links, and explanation.
  2. **Tuning ("more/less of this")** — user gives directional feedback on a briefing item category or topic. The system adjusts future briefing relevance weighting accordingly.
- Feedback accumulates in the user profile as a learning signal that improves briefing quality over time
- Each briefing item gets a unique identifier so user responses can be linked back to specific items

## Capabilities

### New Capabilities
- `briefing-interaction`: Two-way interaction on the briefing channel — deep-dive requests and relevance tuning feedback on individual briefing items

### Modified Capabilities
- `user-profile`: Add feedback history and learned relevance adjustments to the context layer

## Impact

- New briefing interaction types and feedback model
- Modified user profile context layer to store feedback signals
- Each briefing item needs a stable identifier for feedback reference
- Delivery channels become bidirectional (reply handling)
