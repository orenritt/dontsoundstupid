export type EventSourceType = "eventbrite" | "luma" | "meetup" | "manual";
export type EventSourceStatus = "active" | "paused" | "error";

export interface EventSource {
  id: string;
  sourceType: EventSourceType;
  name: string;
  apiConfig: Record<string, string>;
  status: EventSourceStatus;
  pollIntervalMinutes: number;
  createdAt: string;
}

export type EventType = "conference" | "webinar" | "meetup" | "cfp";

export interface EventLocation {
  venue: string | null;
  city: string | null;
  country: string | null;
  virtualUrl: string | null;
  isVirtual: boolean;
}

export interface IndustryEvent {
  id: string;
  sourceId: string;
  externalId: string | null;
  title: string;
  description: string;
  eventType: EventType;
  startDate: string;
  endDate: string | null;
  location: EventLocation;
  speakers: string[];
  topics: string[];
  registrationUrl: string | null;
  ingestedAt: string;
}

export type EventDeltaType =
  | "new-event"
  | "theme-added"
  | "speaker-change"
  | "agenda-update";

export interface EventDelta {
  id: string;
  eventId: string;
  deltaType: EventDeltaType;
  previousValue: string | null;
  newValue: string;
  detectedAt: string;
}

export interface EventTracker {
  eventId: string;
  lastPolledAt: string | null;
  lastContentHash: string | null;
  consecutiveErrors: number;
  lastErrorMessage: string | null;
  nextPollAt: string;
}
