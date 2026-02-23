"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAdminData,
  PageHeader,
  DataTable,
  FilterBar,
  Pagination,
  Badge,
  JsonViewer,
  LoadingState,
  ErrorState,
  formatDate,
} from "../components";

const LAYERS = [
  { label: "All", value: "" },
  { label: "Syndication", value: "syndication" },
  { label: "News", value: "news" },
  { label: "Newsletter", value: "newsletter" },
  { label: "AI Research", value: "ai-research" },
  { label: "Email Forward", value: "email-forward" },
  { label: "Research", value: "research" },
  { label: "Narrative", value: "narrative" },
  { label: "Events", value: "events" },
  { label: "Personal Graph", value: "personal-graph" },
];

const LAYER_COLORS: Record<string, "green" | "blue" | "purple" | "yellow" | "red" | "gray"> = {
  syndication: "blue",
  news: "green",
  newsletter: "purple",
  "ai-research": "yellow",
  "email-forward": "red",
  research: "blue",
  narrative: "purple",
  events: "yellow",
  "personal-graph": "green",
};

interface SignalRow {
  id: string;
  layer: string;
  title: string;
  summary: string;
  source_url: string;
  metadata: unknown;
  published_at: string;
  ingested_at: string;
  content_preview: string;
}

interface DetailData {
  signal: SignalRow & { content_trimmed: string };
  provenance: { id: string; user_id: string; trigger_reason: string; profile_reference: string; email: string; user_name: string; created_at: string }[];
}

export default function SignalsPage() {
  const searchParams = useSearchParams();
  const initialLayer = searchParams.get("layer") || "";
  const [layer, setLayer] = useState(initialLayer);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const limit = 50;

  const params: Record<string, string> = { limit: String(limit), offset: String(offset) };
  if (layer) params.layer = layer;

  const { data, loading, error, refetch } = useAdminData<{ rows: SignalRow[]; total: number }>(
    "signals",
    params
  );

  const { data: detail } = useAdminData<DetailData>(
    "signals-detail",
    selectedId ? { id: selectedId } : { id: "__skip__" }
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Signals" description="All ingested content from every layer">
        <FilterBar filters={LAYERS} value={layer} onChange={(v) => { setLayer(v); setOffset(0); }} />
      </PageHeader>

      {selectedId && detail?.signal ? (
        <div className="mb-6">
          <button
            onClick={() => setSelectedId(null)}
            className="text-sm text-blue-400 hover:underline mb-4 inline-block"
          >
            &larr; Back to list
          </button>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge color={LAYER_COLORS[detail.signal.layer] || "gray"}>
                {detail.signal.layer}
              </Badge>
              <span className="text-xs text-white/30">{detail.signal.id}</span>
            </div>
            <h2 className="text-lg font-semibold">{detail.signal.title}</h2>
            <p className="text-sm text-white/60">{detail.signal.summary}</p>
            {detail.signal.source_url && (
              <a
                href={detail.signal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                {detail.signal.source_url}
              </a>
            )}
            <div className="grid grid-cols-2 gap-4 text-xs text-white/40">
              <div>Published: {formatDate(detail.signal.published_at)}</div>
              <div>Ingested: {formatDate(detail.signal.ingested_at)}</div>
            </div>
            <JsonViewer data={detail.signal.metadata} label="Metadata" />
            {detail.signal.content_trimmed && (
              <JsonViewer data={detail.signal.content_trimmed} label="Content" />
            )}
            {detail.provenance && detail.provenance.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
                  Provenance ({detail.provenance.length})
                </p>
                <div className="space-y-2">
                  {detail.provenance.map((p) => (
                    <div key={p.id} className="bg-black/20 rounded-lg p-3 text-xs">
                      <span className="text-white/50">{p.email || p.user_name}</span>
                      <span className="mx-2 text-white/20">|</span>
                      <Badge>{p.trigger_reason}</Badge>
                      <span className="mx-2 text-white/20">|</span>
                      <span className="text-white/40">{p.profile_reference}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: "layer",
                label: "Layer",
                render: (val) => <Badge color={LAYER_COLORS[String(val)] || "gray"}>{String(val)}</Badge>,
              },
              { key: "title", label: "Title", render: (val) => <span className="text-white font-medium">{String(val).slice(0, 80)}</span> },
              { key: "summary", label: "Summary", render: (val) => <span title={String(val)}>{String(val).slice(0, 120)}</span> },
              { key: "source_url", label: "Source", render: (val) => val ? <span title={String(val)}>{String(val).slice(0, 40)}</span> : null },
              { key: "ingested_at", label: "Ingested", render: (val) => formatDate(val) },
            ]}
            rows={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
            onRowClick={(row) => setSelectedId(row.id as string)}
          />
          <Pagination
            offset={offset}
            limit={limit}
            total={parseInt(String(data?.total ?? 0))}
            onChange={setOffset}
          />
        </>
      )}
    </>
  );
}
