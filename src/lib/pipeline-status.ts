export type PipelineStage =
  | "starting"
  | "loading-profile"
  | "ingesting-news"
  | "ai-research"
  | "loading-signals"
  | "scoring"
  | "composing"
  | "saving"
  | "delivering"
  | "done"
  | "skipped-nothing-interesting"
  | "failed";

export interface PipelineStatus {
  stage: PipelineStage;
  message: string;
  startedAt: number;
  updatedAt: number;
  briefingId?: string;
  error?: string;
  diagnostics?: Record<string, unknown>;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  "starting": "Starting pipeline...",
  "loading-profile": "Loading your profile...",
  "ingesting-news": "Pulling latest news...",
  "ai-research": "Running AI research...",
  "loading-signals": "Gathering candidate signals...",
  "scoring": "Scoring and selecting signals...",
  "composing": "Writing your briefing...",
  "saving": "Saving briefing...",
  "delivering": "Sending delivery...",
  "done": "Briefing ready",
  "skipped-nothing-interesting": "Nothing interesting enough to send today",
  "failed": "Pipeline failed",
};

const statusMap = new Map<string, PipelineStatus>();

const TTL_MS = 10 * 60 * 1000;

export function updatePipelineStatus(userId: string, stage: PipelineStage, extra?: { briefingId?: string; error?: string; diagnostics?: Record<string, unknown> }) {
  const existing = statusMap.get(userId);
  statusMap.set(userId, {
    stage,
    message: STAGE_LABELS[stage],
    startedAt: existing?.startedAt ?? Date.now(),
    updatedAt: Date.now(),
    briefingId: extra?.briefingId,
    error: extra?.error,
    diagnostics: extra?.diagnostics,
  });
}

export function getPipelineStatus(userId: string): PipelineStatus | null {
  const status = statusMap.get(userId);
  if (!status) return null;
  if (Date.now() - status.updatedAt > TTL_MS) {
    statusMap.delete(userId);
    return null;
  }
  return status;
}

export function clearPipelineStatus(userId: string) {
  statusMap.delete(userId);
}
