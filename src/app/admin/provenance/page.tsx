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

interface ProvenanceRow {
  id: string;
  signal_id: string;
  user_id: string;
  trigger_reason: string;
  profile_reference: string;
  created_at: string;
  signal_title: string;
  signal_layer: string;
  email: string;
  user_name: string;
}

const REASON_COLORS: Record<string, "green" | "blue" | "purple" | "yellow" | "red" | "gray"> = {
  "followed-org": "blue",
  "peer-org": "purple",
  "impress-list": "green",
  "intelligence-goal": "yellow",
  "industry-scan": "gray",
  "personal-graph": "red",
  "user-curated": "blue",
  "newsletter-subscription": "purple",
};

export default function ProvenancePage() {
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error, refetch } = useAdminData<{ rows: ProvenanceRow[] }>(
    "provenance",
    { limit: String(limit), offset: String(offset) }
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Signal Provenance"
        description="Why signals were included for specific users - trigger reasons and references"
      />

      <DataTable
        columns={[
          { key: "trigger_reason", label: "Reason", render: (val) => <Badge color={REASON_COLORS[String(val)] || "gray"}>{String(val)}</Badge> },
          { key: "profile_reference", label: "Reference", render: (val) => <span className="text-white font-medium max-w-[200px] block truncate">{String(val)}</span> },
          { key: "signal_title", label: "Signal", render: (val) => <span className="max-w-[250px] block truncate">{String(val || "-")}</span> },
          { key: "signal_layer", label: "Layer", render: (val) => <Badge>{String(val || "-")}</Badge> },
          { key: "email", label: "User", render: (val) => <span className="text-white/40">{String(val)}</span> },
          { key: "created_at", label: "Created", render: (val) => formatDate(val) },
        ]}
        rows={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
      />

      <Pagination offset={offset} limit={limit} total={(data?.rows?.length ?? 0) >= limit ? (offset + limit + 1) : (offset + (data?.rows?.length ?? 0))} onChange={setOffset} />
    </>
  );
}
