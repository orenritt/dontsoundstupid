## ADDED Requirements

### Requirement: Event Source Management

The system MUST manage a registry of event sources from multiple platforms.

#### Scenario: Event source registration

- **WHEN** a new event platform or manual source is configured
- **THEN** the system MUST store the source type (eventbrite, luma, meetup, manual), API configuration, and status
- **AND** MUST validate the source is reachable before marking it active

#### Scenario: Multi-platform normalization

- **WHEN** events are ingested from different platforms
- **THEN** the system MUST normalize them into a single IndustryEvent model regardless of source platform
- **AND** MUST preserve the original source reference for traceability

### Requirement: Industry Event Normalization

The system MUST normalize events from all sources into a standard calendar model.

#### Scenario: Event ingestion

- **WHEN** a new event is discovered from any source
- **THEN** the system MUST create an IndustryEvent record with: title, description, event type (conference/webinar/meetup/cfp), start and end dates, location (physical address or virtual URL), speakers, topics/themes, registration URL, and source reference
- **AND** MUST create a signal with layer "events" and provenance for relevant users

#### Scenario: Event type classification

- **WHEN** an event is ingested
- **THEN** the system MUST classify it as one of: conference, webinar, meetup, or cfp
- **AND** MUST tag it with relevant topics/themes extracted from the event description and agenda

#### Scenario: Location handling

- **WHEN** an event has a physical location
- **THEN** the system MUST store the venue, city, and country
- **WHEN** an event is virtual
- **THEN** the system MUST store the virtual platform URL
- **WHEN** an event is hybrid
- **THEN** the system MUST store both physical and virtual details

### Requirement: Event Delta Tracking

The system MUST detect and record changes to tracked events over time.

#### Scenario: New event detected

- **WHEN** a previously unseen event is found during polling
- **THEN** the system MUST create an event delta with type "new-event" and the full event details as the new value

#### Scenario: Speaker change detected

- **WHEN** a tracked event's speaker list changes between polls
- **THEN** the system MUST create an event delta with type "speaker-change", the previous speaker list, and the updated speaker list
- **AND** MUST generate a signal so affected users are notified

#### Scenario: Agenda update detected

- **WHEN** a tracked event's agenda, topics, or schedule changes
- **THEN** the system MUST create an event delta with type "agenda-update" with previous and new values

#### Scenario: Theme addition detected

- **WHEN** new themes or topics are added to a tracked event
- **THEN** the system MUST create an event delta with type "theme-added" with the new themes

### Requirement: Event Polling and Tracking

The system MUST track event sources and poll for updates on a configurable schedule.

#### Scenario: Scheduled event polling

- **WHEN** an event source's poll interval has elapsed
- **THEN** the system MUST fetch current events from the source
- **AND** MUST compare against previously tracked events to detect new events and changes

#### Scenario: Poll state persistence

- **WHEN** a poll completes successfully
- **THEN** the system MUST update the last-polled timestamp and content hash
- **AND** MUST record any errors with consecutive error count for backoff

#### Scenario: Event source error handling

- **WHEN** an event source poll fails
- **THEN** the system MUST record the failure and retry with exponential backoff
- **AND** MUST NOT remove the source on transient errors
- **AND** MUST flag sources with repeated failures for review
