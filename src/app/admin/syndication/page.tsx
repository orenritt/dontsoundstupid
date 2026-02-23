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

interface FeedRow {
  id: string;
  feed_url: string;
  site_url: string;
  site_name: string;
  feed_type: string;
  last_polled_at: string | null;
  last_item_date: string | null;
  consecutive_errors: number;
  last_error_message: string | null;
  active: boolean;
  created_at: string;
  subscriber_count: number;
}

export default function SyndicationPage() {
  const { data, loading, error, refetch } = useAdminData<{ rows: FeedRow[] }>("syndication-feeds");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Syndication Feeds"
        description="RSS/Atom feeds being polled for content"
      />

      <DataTable
        columns={[
          { key: "site_name", label: "Site", render: (val) => <span className="text-white font-medium">{String(val || "-")}</span> },
          { key: "feed_url", label: "Feed URL", render: (val) => (
            <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline max-w-[250px] block truncate">
              {String(val)}
            </a>
          )},
          { key: "feed_type", label: "Type", render: (val) => <Badge>{String(val)}</Badge> },
          { key: "active", label: "Status", render: (val) => val ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge> },
          { key: "subscriber_count", label: "Subscribers" },
          { key: "consecutive_errors", label: "Errors", render: (val) => {
            const n = Number(val);
            return n > 0 ? <Badge color="red">{n}</Badge> : <span className="text-white/30">0</span>;
          }},
          { key: "last_polled_at", label: "Last Polled", render: (val) => formatDate(val) },
          { key: "last_item_date", label: "Latest Item", render: (val) => formatDate(val) },
          { key: "last_error_message", label: "Last Error", render: (val) => val ? <span className="text-red-400 max-w-[200px] block truncate" title={String(val)}>{String(val)}</span> : null },
        ]}
        rows={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
      />
    </>
  );
}
