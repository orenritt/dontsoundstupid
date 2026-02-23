"use client";

import { useState } from "react";
import {
  useAdminData,
  PageHeader,
  DataTable,
  Badge,
  Pagination,
  LoadingState,
  ErrorState,
  formatDate,
} from "../components";

interface PipelineRow {
  id: string;
  user_id: string;
  status: string;
  run_type: string;
  briefing_id: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  email: string;
  user_name: string;
}

interface StageRow {
  id: string;
  run_id: string;
  stage: string;
  outcome: string;
  started_at: string;
  completed_at: string | null;
  signals_processed: number;
  signals_passed: number;
  error_message: string | null;
}

const STATUS_COLORS: Record<string, "green" | "yellow" | "red" | "blue" | "gray"> = {
  completed: "green",
  running: "blue",
  scheduled: "gray",
  "partial-failure": "yellow",
  failed: "red",
};

const OUTCOME_COLORS: Record<string, "green" | "yellow" | "red" | "gray"> = {
  success: "green",
  "partial-failure": "yellow",
  failure: "red",
  skipped: "gray",
};

export default function PipelinePage() {
  const [offset, setOffset] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const limit = 30;

  const { data, loading, error, refetch } = useAdminData<{ rows: PipelineRow[] }>(
    "pipeline-runs",
    { limit: String(limit), offset: String(offset) }
  );

  const { data: stagesData } = useAdminData<{ rows: StageRow[] }>(
    "pipeline-stages",
    selectedRunId ? { runId: selectedRunId } : { runId: "__skip__" }
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Pipeline Runs"
        description="Briefing pipeline execution history with stage breakdowns"
      />

      {selectedRunId && stagesData?.rows ? (
        <div className="mb-6">
          <button
            onClick={() => setSelectedRunId(null)}
            className="text-sm text-blue-400 hover:underline mb-4 inline-block"
          >
            &larr; Back to runs
          </button>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">
              Pipeline Stages for <span className="font-mono text-white/50">{selectedRunId.slice(0, 8)}</span>
            </h3>
            <DataTable
              columns={[
                { key: "stage", label: "Stage", render: (val) => <span className="text-white font-medium">{String(val)}</span> },
                { key: "outcome", label: "Outcome", render: (val) => <Badge color={OUTCOME_COLORS[String(val)] || "gray"}>{String(val)}</Badge> },
                { key: "signals_processed", label: "Processed" },
                { key: "signals_passed", label: "Passed" },
                { key: "started_at", label: "Started", render: (val) => formatDate(val) },
                { key: "completed_at", label: "Completed", render: (val) => formatDate(val) },
                { key: "error_message", label: "Error", render: (val) => val ? <span className="text-red-400 max-w-[200px] block truncate" title={String(val)}>{String(val)}</span> : null },
              ]}
              rows={(stagesData.rows ?? []) as unknown as Record<string, unknown>[]}
              emptyMessage="No stages recorded for this run"
            />
          </div>
        </div>
      ) : (
        <DataTable
          columns={[
            { key: "status", label: "Status", render: (val) => <Badge color={STATUS_COLORS[String(val)] || "gray"}>{String(val)}</Badge> },
            { key: "run_type", label: "Type", render: (val) => <Badge>{String(val)}</Badge> },
            { key: "email", label: "User", render: (val) => <span className="text-white/50">{String(val)}</span> },
            { key: "started_at", label: "Started", render: (val) => formatDate(val) },
            { key: "completed_at", label: "Completed", render: (val) => formatDate(val) },
            { key: "briefing_id", label: "Briefing", render: (val) => val ? <span className="font-mono text-xs text-white/30">{String(val).slice(0, 8)}</span> : null },
            { key: "error_message", label: "Error", render: (val) => val ? <span className="text-red-400 max-w-[200px] block truncate" title={String(val)}>{String(val)}</span> : null },
          ]}
          rows={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
          onRowClick={(row) => setSelectedRunId(row.id as string)}
        />
      )}

      <Pagination offset={offset} limit={limit} total={(data?.rows?.length ?? 0) >= limit ? (offset + limit + 1) : (offset + (data?.rows?.length ?? 0))} onChange={setOffset} />
    </>
  );
}
