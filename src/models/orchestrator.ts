export type PipelineStage =
  | "ingestion"
  | "scoring"
  | "novelty-filtering"
  | "composition"
  | "delivery"
  | "knowledge-update";

export type PipelineRunStatus =
  | "scheduled"
  | "running"
  | "completed"
  | "partial-failure"
  | "failed";

export type StageOutcome = "success" | "partial-failure" | "failure" | "skipped";

export interface PipelineStageResult {
  stage: PipelineStage;
  outcome: StageOutcome;
  startedAt: string;
  completedAt: string | null;
  signalsProcessed: number;
  signalsPassed: number;
  errorMessage: string | null;
}

export interface PipelineRun {
  id: string;
  userId: string;
  status: PipelineRunStatus;
  runType: "daily" | "t0-seeding" | "retry" | "manual";
  stages: PipelineStageResult[];
  briefingId: string | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface PipelineScheduleEntry {
  userId: string;
  nextRunAt: string;
  timezone: string;
  pipelineLeadTimeMinutes: number;
  lastRunId: string | null;
  lastRunAt: string | null;
  active: boolean;
}

export interface IngestionCycleState {
  cycleId: string;
  startedAt: string;
  completedAt: string | null;
  layersCompleted: string[];
  layersFailed: string[];
  totalSignalsIngested: number;
}
