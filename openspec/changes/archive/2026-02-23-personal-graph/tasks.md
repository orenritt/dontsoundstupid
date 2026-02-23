## 1. TypeScript Types

- [ ] 1.1 Create `src/models/personal-graph.ts` with GraphNode, GraphEdge, GraphWatch, GraphSignal, PersonalGraphConfig types
- [ ] 1.2 Add Zod schemas for all personal-graph types to `src/models/schema.ts`
- [ ] 1.3 Export personal-graph module from `src/models/index.ts`

## 2. Database Schema

- [ ] 2.1 Add `graph_nodes` table to `src/db/schema.sql`
- [ ] 2.2 Add `graph_edges` table to `src/db/schema.sql`
- [ ] 2.3 Add `graph_watches` table to `src/db/schema.sql`
- [ ] 2.4 Add indexes for graph tables

## 3. Verification

- [ ] 3.1 Run `npx tsc --noEmit` and confirm clean compile
- [ ] 3.2 Sync delta spec to main spec at `openspec/specs/personal-graph/spec.md`
- [ ] 3.3 Archive change to `openspec/changes/archive/2026-02-23-personal-graph`
