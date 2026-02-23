"use client";

import {
  useAdminData,
  PageHeader,
  StatCard,
  DataTable,
  LoadingState,
  ErrorState,
  Badge,
  formatDate,
} from "../components";

interface NarrativeData {
  frames: Record<string, unknown>[];
  termBursts: Record<string, unknown>[];
  analysisRuns: Record<string, unknown>[];
}

export default function NarrativesPage() {
  const { data, loading, error, refetch } = useAdminData<NarrativeData>("narrative-frames");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        title="Narrative Detection"
        description="Emerging frames, term bursts, and analysis runs"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Frames" value={data.frames?.length ?? 0} />
        <StatCard label="Term Bursts" value={data.termBursts?.length ?? 0} />
        <StatCard label="Analysis Runs" value={data.analysisRuns?.length ?? 0} />
      </div>

      <h2 className="text-sm font-semibold text-white/60 mb-3">Narrative Frames</h2>
      <DataTable
        columns={[
          { key: "title", label: "Title" },
          { key: "topic_area", label: "Topic" },
          {
            key: "momentum_score",
            label: "Momentum",
            render: (val) => {
              const score = Number(val) || 0;
              const pct = (score * 100).toFixed(0);
              return (
                <Badge color={score >= 0.7 ? "red" : score >= 0.4 ? "yellow" : "gray"}>
                  {pct}%
                </Badge>
              );
            },
          },
          { key: "adoption_count", label: "Adoption" },
          { key: "first_seen_at", label: "First Seen", render: (val) => formatDate(val) },
          { key: "last_seen_at", label: "Last Seen", render: (val) => formatDate(val) },
        ]}
        rows={data.frames || []}
        emptyMessage="No narrative frames detected yet. Run the narrative cron to analyze signals."
      />

      <h2 className="text-sm font-semibold text-white/60 mb-3 mt-8">Term Bursts</h2>
      <DataTable
        columns={[
          { key: "term", label: "Term" },
          { key: "topic_area", label: "Topic" },
          {
            key: "adoption_velocity",
            label: "Velocity",
            render: (val) => {
              const v = Number(val) || 0;
              return (
                <Badge color={v >= 0.7 ? "red" : v >= 0.4 ? "yellow" : "gray"}>
                  {(v * 100).toFixed(0)}%
                </Badge>
              );
            },
          },
          { key: "source_count", label: "Sources" },
          { key: "first_appearance", label: "First Seen", render: (val) => formatDate(val) },
        ]}
        rows={data.termBursts || []}
        emptyMessage="No term bursts detected yet."
      />

      <h2 className="text-sm font-semibold text-white/60 mb-3 mt-8">Recent Analysis Runs</h2>
      <DataTable
        columns={[
          { key: "topic_area", label: "Topic" },
          { key: "signal_count", label: "Signals" },
          { key: "frames_detected", label: "Frames" },
          { key: "term_bursts_detected", label: "Bursts" },
          { key: "model_used", label: "Model" },
          { key: "analyzed_at", label: "Analyzed", render: (val) => formatDate(val) },
        ]}
        rows={data.analysisRuns || []}
        emptyMessage="No analysis runs yet."
      />
    </>
  );
}
