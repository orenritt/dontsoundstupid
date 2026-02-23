# api-layer Specification

## Purpose

Defines the typed REST API contract for all user-facing operations in the Don't Sound Stupid system. Provides generic response envelopes (ApiResponse, PaginatedResponse, ApiError), endpoint-specific request/response types for 11 endpoint groups (Auth, Onboarding, Profile, Impress List, Briefings, Feedback, Calendar, Knowledge Graph, Pipeline, Delivery), and Zod schemas for runtime validation of incoming requests.

## Requirements

### Requirement: Generic API Response Envelope

Every API response MUST use a consistent envelope structure so clients can uniformly parse success and error cases.

#### Scenario: Successful response

- **WHEN** an API endpoint returns data successfully
- **THEN** the response MUST include `success: true` and `data` containing the typed payload
- **AND** `error` MUST be absent or null

#### Scenario: Error response

- **WHEN** an API endpoint encounters an error
- **THEN** the response MUST include `success: false` and an `error` object with `code` (string), `message` (string), and optional `details` (string)
- **AND** `data` MUST be absent or null

#### Scenario: Paginated response

- **WHEN** an API endpoint returns a list that supports pagination
- **THEN** the response MUST extend the standard envelope with `page` (number), `pageSize` (number), `total` (number), and `hasMore` (boolean)

### Requirement: Authentication Endpoints

The system MUST expose endpoints for user registration, login, and token refresh.

#### Scenario: User registration

- **WHEN** a client sends POST /auth/register with email and password
- **THEN** the system MUST create a new user account
- **AND** MUST return the user ID and an auth token pair (access + refresh)

#### Scenario: User login

- **WHEN** a client sends POST /auth/login with email and password
- **THEN** the system MUST validate credentials
- **AND** MUST return an auth token pair on success

#### Scenario: Token refresh

- **WHEN** a client sends POST /auth/refresh with a valid refresh token
- **THEN** the system MUST return a new auth token pair
- **AND** MUST invalidate the old refresh token

### Requirement: Onboarding Endpoints

The system MUST expose endpoints to start, progress through, and check status of the onboarding conversation.

#### Scenario: Start onboarding

- **WHEN** a client sends POST /onboarding/start
- **THEN** the system MUST initialize a new onboarding session for the authenticated user
- **AND** MUST return the first step's prompt and step ID

#### Scenario: Submit onboarding step

- **WHEN** a client sends POST /onboarding/step/:stepId with step-specific data
- **THEN** the system MUST validate and process the step submission
- **AND** MUST return the next step's prompt and step ID, or signal completion

#### Scenario: Check onboarding status

- **WHEN** a client sends GET /onboarding/status
- **THEN** the system MUST return the current step, total steps, and completion status

### Requirement: Profile Endpoints

The system MUST expose endpoints to retrieve and update the user's profile and context.

#### Scenario: Get full profile

- **WHEN** a client sends GET /profile
- **THEN** the system MUST return the authenticated user's complete profile

#### Scenario: Update context

- **WHEN** a client sends PATCH /profile/context with partial context updates (initiatives, concerns, topics, knowledge gaps, intelligence goals)
- **THEN** the system MUST merge the updates into the user's context layer
- **AND** MUST preserve a snapshot of the previous context in history

#### Scenario: Get peer list

- **WHEN** a client sends GET /profile/peers
- **THEN** the system MUST return the user's peer organization list

#### Scenario: Update peer list

- **WHEN** a client sends PATCH /profile/peers with peer additions, removals, or confirmation changes
- **THEN** the system MUST update the user's peer list accordingly

### Requirement: Impress List Endpoints

The system MUST expose CRUD endpoints for managing the user's impress list contacts.

#### Scenario: List impress contacts

- **WHEN** a client sends GET /impress
- **THEN** the system MUST return all active contacts in the user's impress list, grouped by tier

#### Scenario: Add impress contact

- **WHEN** a client sends POST /impress with a LinkedIn URL
- **THEN** the system MUST enrich the contact, add them to the impress list with source "user-added", and return the enriched contact

#### Scenario: Remove impress contact

- **WHEN** a client sends DELETE /impress/:id
- **THEN** the system MUST mark the contact as inactive (soft delete)

#### Scenario: Update impress contact

- **WHEN** a client sends PATCH /impress/:id with updates (tier, status)
- **THEN** the system MUST apply the updates to the specified contact

### Requirement: Briefing Endpoints

The system MUST expose endpoints to retrieve past and current briefings.

#### Scenario: List recent briefings

- **WHEN** a client sends GET /briefings with optional pagination
- **THEN** the system MUST return the user's recent briefings in reverse chronological order

#### Scenario: Get specific briefing

- **WHEN** a client sends GET /briefings/:id
- **THEN** the system MUST return the full briefing with all items and metadata

#### Scenario: Get latest briefing

- **WHEN** a client sends GET /briefings/latest
- **THEN** the system MUST return the most recently generated briefing for the user

### Requirement: Feedback Endpoints

The system MUST expose endpoints for submitting feedback on briefing items.

#### Scenario: Deep-dive request

- **WHEN** a client sends POST /feedback/deep-dive with a briefing item ID and topic
- **THEN** the system MUST record a deep-dive request and trigger expanded content generation

#### Scenario: Tune feedback

- **WHEN** a client sends POST /feedback/tune with a briefing item ID, direction (more or less), and optional comment
- **THEN** the system MUST record the tuning signal to adjust future relevance scoring

#### Scenario: Not-novel feedback

- **WHEN** a client sends POST /feedback/not-novel with a briefing item ID
- **THEN** the system MUST record the signal and update the knowledge graph to reflect the user already knew this

### Requirement: Calendar Endpoints

The system MUST expose endpoints for managing calendar connections and viewing meeting data.

#### Scenario: Connect calendar

- **WHEN** a client sends POST /calendar/connect with provider type and OAuth auth code
- **THEN** the system MUST exchange the auth code for tokens and establish the calendar connection

#### Scenario: Disconnect calendar

- **WHEN** a client sends DELETE /calendar/disconnect
- **THEN** the system MUST revoke tokens and set the calendar connection status to disconnected

#### Scenario: List upcoming meetings

- **WHEN** a client sends GET /calendar/meetings
- **THEN** the system MUST return the user's upcoming meetings with attendee and intelligence data

### Requirement: Knowledge Graph Endpoints

The system MUST expose endpoints for users to view and manage what the system thinks they know.

#### Scenario: View knowledge entities

- **WHEN** a client sends GET /knowledge/entities with optional type filter and pagination
- **THEN** the system MUST return the user's knowledge entities

#### Scenario: Add knowledge entity manually

- **WHEN** a client sends POST /knowledge/entities with entity type, name, and description
- **THEN** the system MUST add the entity to the user's knowledge graph with source "profile-derived" and confidence 1.0

#### Scenario: Remove knowledge entity

- **WHEN** a client sends DELETE /knowledge/entities/:id
- **THEN** the system MUST remove the entity and its edges from the knowledge graph

### Requirement: Pipeline Endpoints

The system MUST expose endpoints for viewing pipeline run history and triggering manual runs.

#### Scenario: View run history

- **WHEN** a client sends GET /pipeline/runs with optional pagination
- **THEN** the system MUST return the user's pipeline runs in reverse chronological order with stage results

#### Scenario: Trigger manual run

- **WHEN** a client sends POST /pipeline/trigger
- **THEN** the system MUST enqueue a manual pipeline run for the user
- **AND** MUST return the new run's ID and status

### Requirement: Delivery Preferences Endpoint

The system MUST expose an endpoint for updating delivery preferences.

#### Scenario: Update delivery preferences

- **WHEN** a client sends PATCH /delivery with partial delivery preference updates (channel, time, timezone, format)
- **THEN** the system MUST merge the updates into the user's delivery preferences
- **AND** MUST recalculate the next scheduled delivery time if time or timezone changed
