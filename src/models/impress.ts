import type { EnrichedPerson } from "./identity";

export type ImpressContactSource =
  | "onboarding"
  | "user-added"
  | "promoted-from-calendar"
  | "settings";

export type ImpressContactTier = "core" | "temporary";

export type ImpressContactStatus = "active" | "inactive";

export type EnrichmentDepth = "full" | "light" | "none";

export type ResearchStatus = "none" | "pending" | "completed" | "failed";

export interface ImpressContact {
  person: EnrichedPerson;
  source: ImpressContactSource;
  tier: ImpressContactTier;
  status: ImpressContactStatus;
  linkedMeetingId: string | null;
  activeFrom: string | null;
  activeUntil: string | null;
  addedAt: string;
  removedAt: string | null;
  researchStatus: ResearchStatus;
  lastEnrichedAt: string | null;
  enrichmentVersion: number;
  enrichmentDepth: EnrichmentDepth;
}

export interface ImpressList {
  core: ImpressContact[];
  temporary: ImpressContact[];
}
