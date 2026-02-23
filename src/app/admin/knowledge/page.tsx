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

interface EntityRow {
  id: string;
  user_id: string;
  entity_type: string;
  name: string;
  description: string;
  source: string;
  confidence: number;
  known_since: string;
  last_reinforced: string;
  email: string;
  user_name: string;
}

interface EdgeRow {
  id: string;
  relationship: string;
  source_name: string;
  source_type: string;
  target_name: string;
  target_type: string;
}

const TYPE_COLORS: Record<string, "green" | "blue" | "purple" | "yellow" | "red" | "gray"> = {
  company: "blue",
  person: "green",
  concept: "purple",
  term: "yellow",
  product: "red",
  event: "gray",
  fact: "gray",
};

export default function KnowledgePage() {
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState<"entities" | "edges">("entities");
  const limit = 50;

  const { data, loading, error, refetch } = useAdminData<{
    entities: EntityRow[];
    edges: EdgeRow[];
  }>("knowledge-graph", { limit: String(limit), offset: String(offset) });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Knowledge Graph"
        description="User knowledge entities and relationship edges"
      >
        <div className="flex gap-2">
          <button
            onClick={() => setTab("entities")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "entities" ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
          >
            Entities
          </button>
          <button
            onClick={() => setTab("edges")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "edges" ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
          >
            Edges
          </button>
        </div>
      </PageHeader>

      {tab === "entities" ? (
        <DataTable
          columns={[
            { key: "entity_type", label: "Type", render: (val) => <Badge color={TYPE_COLORS[String(val)] || "gray"}>{String(val)}</Badge> },
            { key: "name", label: "Name", render: (val) => <span className="text-white font-medium">{String(val)}</span> },
            { key: "description", label: "Description", render: (val) => <span className="max-w-[200px] block truncate">{String(val || "-")}</span> },
            { key: "source", label: "Source", render: (val) => <Badge>{String(val)}</Badge> },
            { key: "confidence", label: "Confidence", render: (val) => {
              const conf = Number(val);
              const color = conf >= 0.8 ? "green" : conf >= 0.5 ? "yellow" : "red";
              return <Badge color={color}>{(conf * 100).toFixed(0)}%</Badge>;
            }},
            { key: "email", label: "User", render: (val) => <span className="text-white/40">{String(val)}</span> },
            { key: "known_since", label: "Known Since", render: (val) => formatDate(val) },
            { key: "last_reinforced", label: "Last Reinforced", render: (val) => formatDate(val) },
          ]}
          rows={(data?.entities ?? []) as unknown as Record<string, unknown>[]}
        />
      ) : (
        <DataTable
          columns={[
            { key: "source_name", label: "Source Entity", render: (val, row) => (
              <span className="text-white font-medium">
                {String(val)} <Badge color={TYPE_COLORS[String(row.source_type)] || "gray"}>{String(row.source_type)}</Badge>
              </span>
            )},
            { key: "relationship", label: "Relationship", render: (val) => <Badge color="purple">{String(val)}</Badge> },
            { key: "target_name", label: "Target Entity", render: (val, row) => (
              <span className="text-white font-medium">
                {String(val)} <Badge color={TYPE_COLORS[String(row.target_type)] || "gray"}>{String(row.target_type)}</Badge>
              </span>
            )},
          ]}
          rows={(data?.edges ?? []) as unknown as Record<string, unknown>[]}
        />
      )}

      <Pagination offset={offset} limit={limit} total={(data?.entities?.length ?? 0) >= limit ? (offset + limit + 1) : (offset + (data?.entities?.length ?? 0))} onChange={setOffset} />
    </>
  );
}
