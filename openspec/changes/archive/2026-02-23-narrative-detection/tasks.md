## 1. Narrative Detection Model

- [ ] 1.1 Create `src/models/narrative.ts` with: NarrativeSourceType, NarrativeSource (type, config), NarrativeFrame (title, description, first seen, momentum score, adoption count, related signals), TermBurst (term, frequency delta, first appearance, adoption velocity, context examples), NarrativeAnalysis (frames, term bursts, analysis timestamp, LLM model), NarrativeConfig (LLM provider, analysis frequency, minimum adoption threshold)
- [ ] 1.2 Add Zod schemas for all narrative types in `src/models/schema.ts`
- [ ] 1.3 Export new types from `src/models/index.ts`

## 2. Database Schema

- [ ] 2.1 Add narrative_frames table to `src/db/schema.sql`
- [ ] 2.2 Add term_bursts table to `src/db/schema.sql`

## 3. Verify

- [ ] 3.1 Run TypeScript compiler — all files compile clean
