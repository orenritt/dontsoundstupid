import type { EnrichedPerson } from "./identity";

export type ImpressContactSource =
  | "onboarding"
  | "user-added"
  | "promoted-from-calendar";

export type ImpressContactTier = "core" | "temporary";

export type ImpressContactStatus = "active" | "inactive";

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
}

export interface ImpressList {
  core: ImpressContact[];
  temporary: ImpressContact[];
}
