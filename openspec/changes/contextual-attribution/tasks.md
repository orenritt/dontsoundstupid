## 1. Model Updates

- [x] 1.1 Add `attribution` field to `SignalSelection` interface in `src/models/relevance.ts`
- [x] 1.2 Add `attribution` field to briefing item type in `src/lib/schema.ts` (briefings table items JSONB shape)

## 2. Scoring Agent — Attribution Output

- [x] 2.1 Update `submit_selections` tool definition in `TOOL_DEFINITIONS` to include `attribution` field in the selection schema
- [x] 2.2 Update `parseSelections` to extract the `attribution` field from agent output
- [x] 2.3 Update agent system prompt to instruct the agent to produce specific, profile-grounded attributions for each selection (referencing tool call results — knowledge gaps, impress list, peer orgs, meetings, feedback)

## 3. Pipeline — Pass Attribution Through

- [x] 3.1 Update the `selectedSignals` mapping in `pipeline.ts` to include the `attribution` field from agent selections
- [x] 3.2 Update the composition LLM prompt to receive attribution per signal and instruct it to weave attribution naturally into the briefing item body
- [x] 3.3 Update the composition output schema to include `attribution` field per item
- [x] 3.4 Update the fallback composition (catch block) to pass through attribution from selections

## 4. Frontend — Display Attribution

- [x] 4.1 Update `BriefingItem` interface in `src/app/briefing/page.tsx` to include optional `attribution` field
- [x] 4.2 No additional UI changes needed — attribution is woven into `content` by the composition LLM. The `attribution` field is metadata for potential future use.
