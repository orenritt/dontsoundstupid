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

interface FeedbackRow {
  id: string;
  user_id: string;
  briefing_id: string;
  briefing_item_id: string;
  type: string;
  topic: string;
  comment: string;
  created_at: string;
  email: string;
  user_name: string;
}

const TYPE_COLORS: Record<string, "green" | "blue" | "purple" | "yellow" | "red"> = {
  "more-like-this": "green",
  "less-like-this": "red",
  "not-novel": "yellow",
  "deep-dive": "blue",
};

export default function FeedbackPage() {
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error, refetch } = useAdminData<{ rows: FeedbackRow[] }>(
    "feedback",
    { limit: String(limit), offset: String(offset) }
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Feedback Signals"
        description="User feedback on briefing items - tuning, dismissals, deep-dives"
      />

      <DataTable
        columns={[
          { key: "type", label: "Type", render: (val) => <Badge color={TYPE_COLORS[String(val)] || "gray"}>{String(val)}</Badge> },
          { key: "topic", label: "Topic", render: (val) => <span className="text-white font-medium max-w-[200px] block truncate">{String(val || "-")}</span> },
          { key: "comment", label: "Comment", render: (val) => <span className="max-w-[200px] block truncate">{String(val || "-")}</span> },
          { key: "email", label: "User", render: (val) => <span className="text-white/40">{String(val)}</span> },
          { key: "created_at", label: "When", render: (val) => formatDate(val) },
          { key: "briefing_id", label: "Briefing", render: (val) => <span className="font-mono text-white/30 text-xs">{String(val).slice(0, 8)}</span> },
        ]}
        rows={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
      />

      <Pagination offset={offset} limit={limit} total={(data?.rows?.length ?? 0) >= limit ? (offset + limit + 1) : (offset + (data?.rows?.length ?? 0))} onChange={setOffset} />
    </>
  );
}
