import type { BriefingFormat } from "./delivery";

export type LlmProvider = "openai" | "anthropic";

export interface ComposerConfig {
  provider: LlmProvider;
  model: string;
  maxTokens: number;
  temperature: number;
  /** Target number of briefing items. Default: 5. */
  targetItems: number;
  /** Max sentences per item. Default: 2. */
  maxSentencesPerItem: number;
}

export interface ScoredSignalRef {
  signalId: string;
  title: string;
  summary: string;
  relevanceScore: number;
  noveltyScore: number;
  novelElements: string[];
  layer: string;
  metadata: Record<string, string>;
}

export interface MeetingContext {
  meetingId: string;
  title: string;
  startTime: string;
  attendeeSummaries: {
    name: string;
    role: string | null;
    company: string | null;
  }[];
  relevantSignalIds: string[];
  suggestedTalkingPoints: string[];
}

export interface BriefingPrompt {
  userId: string;
  userContextSummary: string;
  role: string;
  company: string;
  initiatives: string[];
  concerns: string[];
  intelligenceGoals: string[];
  scoredSignals: ScoredSignalRef[];
  format: BriefingFormat;
  meetingContext: MeetingContext[] | null;
}

export type BriefingReason =
  | "people-are-talking"
  | "meeting-prep"
  | "new-entrant"
  | "fundraise-or-deal"
  | "regulatory-or-policy"
  | "term-emerging"
  | "network-activity"
  | "your-space"
  | "competitive-move"
  | "event-upcoming"
  | "other";

export interface BriefingSection {
  itemNumber: number;
  reason: BriefingReason;
  reasonLabel: string;
  title: string;
  content: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  sourceSignalIds: string[];
}

export type BriefingOutcome = "delivered" | "zero-briefing";

export interface ComposedBriefing {
  id: string;
  userId: string;
  outcome: BriefingOutcome;
  sections: BriefingSection[];
  meetingPrepSections: BriefingSection[] | null;
  format: BriefingFormat;
  modelUsed: string;
  providerUsed: LlmProvider;
  promptTokens: number;
  completionTokens: number;
  filteredByNoveltyCount: number;
  generatedAt: string;
}

export type DeliveryChannelType = "email" | "slack" | "sms" | "whatsapp";
export type DeliveryStatus = "pending" | "sent" | "failed" | "bounced";

export interface DeliveryAttempt {
  id: string;
  briefingId: string;
  channel: DeliveryChannelType;
  status: DeliveryStatus;
  attemptNumber: number;
  attemptedAt: string;
  errorMessage: string | null;
}

export interface BriefingSchedule {
  id: string;
  userId: string;
  nextDeliveryAt: string;
  timezone: string;
  preferredTime: string;
  lastDeliveredAt: string | null;
  active: boolean;
}
