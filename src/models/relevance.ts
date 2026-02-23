import type { Signal } from "./signal";

export type ScoringFactorName =
  | "keyword-match"
  | "semantic-similarity"
  | "provenance"
  | "goal-alignment"
  | "feedback-boost"
  | "freshness"
  | "novelty";

export interface ScoringFactor {
  factor: ScoringFactorName;
  weight: number;
  rawScore: number;
  weightedScore: number;
}

export interface RelevanceScore {
  signalId: string;
  userId: string;
  totalScore: number;
  factors: ScoringFactor[];
  scoredAt: string;
}

export type ProvenanceType = "standard" | "user-curated";

export interface ScoringConfig {
  factorWeights: Record<ScoringFactorName, number>;
  minimumThreshold: number;
  noveltyMinimumThreshold: number;
  freshnessDecayRate: number;
  maxSignalsPerBriefing: number;
  noveltyMultiplicative: boolean;
}

export interface RelevanceScoredSignal {
  signal: Signal;
  score: RelevanceScore;
}

export interface ScoredSignalBatch {
  userId: string;
  scoringRunAt: string;
  scoredSignals: RelevanceScoredSignal[];
  aboveThreshold: RelevanceScoredSignal[];
  belowThreshold: RelevanceScoredSignal[];
}

// --- Agent-based scoring types ---

export type AgentToolName =
  | "check_knowledge_graph"
  | "check_feedback_history"
  | "compare_with_peers"
  | "get_signal_provenance"
  | "assess_freshness"
  | "web_search"
  | "query_google_trends"
  | "check_today_meetings"
  | "research_meeting_attendees"
  | "search_briefing_history"
  | "cross_reference_signals"
  | "check_expertise_gaps"
  | "check_signal_momentum"
  | "submit_selections";

export interface AgentToolCall {
  tool: AgentToolName;
  args: Record<string, unknown>;
}

export interface AgentToolResult {
  tool: AgentToolName;
  result: unknown;
}

export interface SignalSelection {
  signalIndex: number;
  reason: string;
  reasonLabel: string;
  confidence: number;
  noveltyAssessment: string;
  attribution: string;
  toolsUsed: AgentToolName[];
}

export interface AgentScoringResult {
  userId: string;
  selections: SignalSelection[];
  reasoning: string;
  toolCallLog: { tool: AgentToolName; args: Record<string, unknown>; summary: string }[];
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  scoredAt: string;
}

export interface AgentScoringConfig {
  model: string;
  temperature: number;
  maxToolRounds: number;
  targetSelections: number;
  candidatePoolSize: number;
  forceGenerate?: boolean;
}
