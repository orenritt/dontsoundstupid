export type IntelligenceGoalCategory =
  | "industry-trends"
  | "new-jargon"
  | "new-entrants"
  | "best-practices"
  | "research"
  | "regulatory"
  | "competitive-intelligence"
  | "network-intelligence"
  | "custom";

export interface IntelligenceGoal {
  category: IntelligenceGoalCategory;
  detail: string | null;
  addedAt: string;
  active: boolean;
}

import type { FeedbackHistory } from "./feedback.js";

export interface ContextLayer {
  initiatives: Initiative[];
  concerns: Concern[];
  topics: string[];
  knowledgeGaps: string[];
  intelligenceGoals: IntelligenceGoal[];
  geographicRelevance: string[];
  feedbackHistory: FeedbackHistory;
  updatedAt: string;
  history: ContextSnapshot[];
}

export interface Initiative {
  description: string;
  addedAt: string;
  active: boolean;
}

export interface Concern {
  description: string;
  addedAt: string;
  active: boolean;
}

/**
 * Preserved snapshot when context is updated,
 * so we can track how the user's focus evolves over time.
 */
export interface ContextSnapshot {
  initiatives: Initiative[];
  concerns: Concern[];
  topics: string[];
  knowledgeGaps: string[];
  intelligenceGoals: IntelligenceGoal[];
  snapshotAt: string;
}
