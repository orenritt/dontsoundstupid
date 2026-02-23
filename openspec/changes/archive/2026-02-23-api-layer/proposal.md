## Why

The data model layer is complete — user profiles, signal store, relevance scoring, knowledge graph, briefing composition, and daily pipeline orchestration all have typed models, Zod schemas, and Postgres tables. But there is no API surface for clients to interact with this system. Users need REST endpoints to register, onboard, manage their profile and impress list, receive briefings, provide feedback, connect calendars, inspect their knowledge graph, and trigger or monitor pipeline runs. The API layer defines the request/response contract for every user-facing operation so that clients (web, mobile, CLI) can integrate without coupling to internal model shapes.

## What Changes

- Define generic API response wrappers: ApiResponse<T>, PaginatedResponse<T>, ApiError
- Define route-specific request/response types for 11 endpoint groups: Auth, Onboarding, Profile, Impress List, Briefings, Feedback, Calendar, Knowledge Graph, Pipeline, Delivery
- Define discriminated union types for polymorphic submissions: FeedbackSubmission, OnboardingStepSubmission
- Add Zod schemas for all API types for runtime validation of incoming requests
- Export from the model barrel file

## Capabilities

### New Capabilities
- `api-layer`: Typed REST endpoint definitions covering authentication, onboarding, profile management, impress list CRUD, briefing retrieval, feedback submission, calendar integration, knowledge graph inspection, pipeline control, and delivery preferences

## Impact

- New `src/models/api.ts` with all API request/response types
- New Zod schemas appended to `src/models/schema.ts`
- New export in `src/models/index.ts`
- No changes to existing types or DB schema — purely additive
- Depends on existing: UserProfile, Briefing, ImpressContact, KnowledgeEntity, PipelineRun, DeliveryPreferences, FeedbackSignal
