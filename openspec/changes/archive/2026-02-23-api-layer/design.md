## Context

The data model layer has 21 TypeScript model files covering user profiles, signal store, 6 ingestion layers, relevance scoring, knowledge graph novelty, briefing composition, and daily pipeline orchestration. All types have corresponding Zod schemas and Postgres tables. The API layer defines the typed request/response contract for REST endpoints that clients use to interact with this system.

## Goals / Non-Goals

**Goals:**
- Generic response envelope (ApiResponse<T>, PaginatedResponse<T>, ApiError) used by all endpoints
- Request body types for every write endpoint (POST, PATCH, DELETE)
- Response payload types for every read endpoint (GET)
- Discriminated union for polymorphic feedback submission
- Zod schemas for runtime validation of incoming requests
- All types reference existing model types — no duplication of domain models

**Non-Goals:**
- Route handler implementation (separate from type definitions)
- Authentication middleware or JWT token handling logic
- Rate limiting, CORS, or other HTTP-layer concerns
- OpenAPI/Swagger generation (can be derived from Zod schemas later)
- WebSocket or real-time endpoint definitions

## Decisions

### Decision 1: Generic envelope, not per-endpoint wrappers

All endpoints return `ApiResponse<T>` or `PaginatedResponse<T>`. This gives clients a single parsing path: check `success`, then cast `data` to the expected type. Error handling is uniform via `ApiError`.

### Decision 2: Request types are separate from domain models

Request body types (e.g., `RegisterRequest`, `AddImpressContactRequest`) are distinct from domain models (e.g., `ImpressContact`, `UserProfile`). Requests carry only the fields the client submits; responses may return full domain objects. This keeps the API contract stable even if internal models evolve.

### Decision 3: FeedbackSubmission as discriminated union

Feedback submission uses a `type` discriminator ("deep-dive", "tune-more", "tune-less", "not-novel") matching the existing FeedbackSignal union. This keeps the API contract aligned with the domain model's structure.

### Decision 4: Onboarding step submission as flexible data bag

`OnboardingStepSubmission` carries `stepId` and `data: Record<string, unknown>` because each onboarding step collects different information (LinkedIn URL, company info, topics, peers, etc.). Validation is step-specific at the handler level.

### Decision 5: Patch endpoints accept Partial<T>

PATCH endpoints (profile context, delivery preferences, impress contact update) accept partial objects. The API layer types use `Partial<>` of the relevant domain type fields so clients send only changed fields.

## Risks / Trade-offs

- **Loose onboarding data typing** — `Record<string, unknown>` for step data trades compile-time safety for flexibility. Mitigation: step-specific Zod schemas at the handler level.
- **No versioning in types** — API types don't encode a version. Mitigation: introduce versioned route prefixes (e.g., `/v1/`) at the router level, not in types.
- **Pagination defaults not in types** — Page/pageSize defaults are handler concerns. Types define the contract, handlers define behavior.
