## 1. Signal Pool Momentum Tool

- [x] 1.1 Create `src/lib/signal-momentum.ts` with `executeCheckSignalMomentum` function: accept `queries` (string[], max 5) and optional `windowDays` (default 7), query the `signals` table for case-insensitive substring matches in title/summary/content across two consecutive time windows, compute acceleration ratio and classification (surging/rising/stable/declining/new per spec thresholds), return top 3 recent matching signals per query
- [x] 1.2 Add `"check_signal_momentum"` to the `AgentToolName` union type in `src/models/relevance.ts`
- [x] 1.3 Register `check_signal_momentum` in the `executeTool` switch statement in `src/lib/scoring-agent.ts`, wiring it to the new `executeCheckSignalMomentum` function
- [x] 1.4 Add tool definition #14 (`check_signal_momentum`) to the `TOOL_DEFINITIONS` string in `src/lib/scoring-agent.ts` — describe purpose, args (queries array, optional windowDays), and return format

## 2. Scoring Agent Prompt Changes

- [x] 2.1 Update `buildSystemPrompt` in `src/lib/scoring-agent.ts`: replace "select the top N" language with "select up to N signals that clear the interestingness bar"
- [x] 2.2 Add `INTERESTINGNESS THRESHOLD` section to the system prompt with the four criteria: sharp colleague test, concreteness, recency, consequence — plus the momentum boost rule (surging/rising topics lower the bar)
- [x] 2.3 Add explicit instruction in the system prompt that submitting an empty selections array is valid and preferred when no candidates clear the bar
- [x] 2.4 Integrate momentum into the `YOUR SELECTION CRITERIA` section — add signal pool momentum as a named criterion alongside the existing Google Trends momentum, noting they complement each other (internal vs external)

## 3. Empty Selections Handling

- [x] 3.1 Update `parseSelections` in `src/lib/scoring-agent.ts` to return `[]` (empty array) instead of `null` when the selections array is empty
- [x] 3.2 Update the agent loop in `runScoringAgent` to treat `selections.length === 0` as a valid submission (not malformed) — return a valid `AgentScoringResult` with empty selections array
- [x] 3.3 Update the forced-final-selection path (max rounds exhausted) to allow the agent to submit zero selections instead of forcing it to pick N

## 4. Pipeline Zero-Selection Path

- [x] 4.1 Add `"skipped-nothing-interesting"` to the `PipelineStage` type and `STAGE_LABELS` map in `src/lib/pipeline-status.ts`
- [x] 4.2 Update `runPipeline` in `src/lib/pipeline.ts` to handle `agentResult.selections.length === 0` as a legitimate outcome: skip composition and delivery, call `updatePipelineStatus(userId, "skipped-nothing-interesting", { diagnostics: { candidateCount, scoringReasoning } })`, and return a distinct non-null result (e.g. return `"skipped"` or a sentinel) instead of `null`
- [x] 4.3 Verify that API routes consuming `runPipeline`'s return value handle the new skip return correctly (check `src/app/api/` routes that call `runPipeline`)

## 5. Variable-Length Briefing Composition

- [x] 5.1 Update the composition system prompt in `src/lib/pipeline.ts` to say "You will receive 1 to 5 signals" instead of implying a fixed count
- [x] 5.2 Remove any hard assertions of exactly 5 items in the composition path and delivery formatting (check email template in `src/lib/delivery.ts` for fixed-count assumptions)
- [x] 5.3 Verify the briefing items JSON array in the `briefings` table already supports variable length (it does — jsonb array — but confirm no downstream code assumes `.length === 5`)

## 6. Pipeline Status Tests

- [x] 6.1 Add `"skipped-nothing-interesting"` to the stage label mapping test in `src/lib/__tests__/pipeline-status.test.ts`
- [x] 6.2 Update the E2E mock in `e2e/helpers/api-mocks.ts` if it returns hardcoded pipeline status values — ensure it can return the new skip status
