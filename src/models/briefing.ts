import type { BriefingReason } from "./composer";

export interface BriefingItem {
  id: string;
  itemNumber: number;
  reason: BriefingReason;
  reasonLabel: string;
  topic: string;
  content: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  sourceSignalIds: string[];
}

export interface Briefing {
  id: string;
  userId: string;
  items: BriefingItem[];
  generatedAt: string;
  deliveredAt: string | null;
}
