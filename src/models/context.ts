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

export type ExpertiseLevel = "novice" | "developing" | "proficient" | "expert";

export interface SelfAssessment {
  category: IntelligenceGoalCategory;
  level: ExpertiseLevel;
  assessedAt: string;
}

export interface CategoryScoringOverride {
  category: IntelligenceGoalCategory;
  relevanceMultiplier: number;
  noveltyThreshold: number;
  derivedFrom: ExpertiseLevel;
}

import type { FeedbackHistory } from "./feedback";

export interface ContextLayer {
  initiatives: Initiative[];
  concerns: Concern[];
  topics: string[];
  knowledgeGaps: string[];
  intelligenceGoals: IntelligenceGoal[];
  selfAssessments: SelfAssessment[];
  categoryScoringOverrides: CategoryScoringOverride[];
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
  selfAssessments: SelfAssessment[];
  snapshotAt: string;
}
