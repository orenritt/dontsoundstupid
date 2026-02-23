"use client";

import {
  useAdminData,
  PageHeader,
  DataTable,
  Badge,
  LoadingState,
  ErrorState,
  formatDate,
} from "../components";

interface NewsQueryRow {
  id: string;
  user_id: string;
  query_text: string;
  derived_from: string;
  profile_reference: string;
  content_hash: string;
  geographic_filters: string[];
  active: boolean;
  created_at: string;
  last_polled_at: string | null;
  result_count: number | null;
  consecutive_errors: number | null;
  last_error_message: string | null;
  next_poll_at: string | null;
  email: string;
  user_name: string;
}

const DERIVED_COLORS: Record<string, "green" | "blue" | "purple" | "yellow"> = {
  "impress-list": "blue",
  "peer-org": "purple",
  "intelligence-goal": "yellow",
  industry: "green",
};

export default function NewsPage() {
  const { data, loading, error, refetch } = useAdminData<{ rows: NewsQueryRow[] }>("news-queries");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="News Queries"
        description="Derived queries used to poll NewsAPI.ai for news articles"
      />

      <DataTable
        columns={[
          { key: "query_text", label: "Query", render: (val) => <span className="text-white font-medium max-w-[300px] block truncate">{String(val)}</span> },
          { key: "derived_from", label: "Derived From", render: (val) => <Badge color={DERIVED_COLORS[String(val)] || "gray"}>{String(val)}</Badge> },
          { key: "profile_reference", label: "Reference", render: (val) => <span>{String(val).slice(0, 40)}</span> },
          { key: "email", label: "User", render: (val) => <span className="text-white/50">{String(val)}</span> },
          { key: "active", label: "Active", render: (val) => val ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge> },
          { key: "result_count", label: "Results", render: (val) => String(val ?? 0) },
          { key: "consecutive_errors", label: "Errors", render: (val) => {
            const num = Number(val ?? 0);
            return num > 0 ? <Badge color="red">{num}</Badge> : <span className="text-white/30">0</span>;
          }},
          { key: "last_polled_at", label: "Last Polled", render: (val) => formatDate(val) },
          { key: "next_poll_at", label: "Next Poll", render: (val) => formatDate(val) },
        ]}
        rows={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
      />
    </>
  );
}
