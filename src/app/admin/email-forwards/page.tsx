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

interface EmailForwardRow {
  id: string;
  user_id: string;
  sender_email: string;
  subject: string;
  user_annotation: string | null;
  original_sender: string | null;
  extracted_urls: string[];
  primary_url: string | null;
  signal_id: string | null;
  received_at: string;
  processed_at: string;
  content_preview: string;
  email: string;
  user_name: string;
}

export default function EmailForwardsPage() {
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error, refetch } = useAdminData<{ rows: EmailForwardRow[] }>(
    "email-forwards",
    { limit: String(limit), offset: String(offset) }
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Email Forwards"
        description="Emails forwarded by users for ingestion into their signal pool"
      />

      <DataTable
        columns={[
          { key: "subject", label: "Subject", render: (val) => <span className="text-white font-medium max-w-[250px] block truncate">{String(val)}</span> },
          { key: "sender_email", label: "From" },
          { key: "original_sender", label: "Original Sender", render: (val) => <span>{String(val || "-")}</span> },
          { key: "email", label: "User", render: (val) => <span className="text-white/40">{String(val)}</span> },
          { key: "signal_id", label: "Signal", render: (val) => val ? <Badge color="green">Linked</Badge> : <Badge color="gray">Unlinked</Badge> },
          { key: "extracted_urls", label: "URLs", render: (val) => {
            const urls = val as string[] | null;
            return <span>{urls?.length || 0}</span>;
          }},
          { key: "received_at", label: "Received", render: (val) => formatDate(val) },
          { key: "content_preview", label: "Preview", render: (val) => <span className="max-w-[200px] block truncate text-white/40">{String(val || "-")}</span> },
        ]}
        rows={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
      />

      <Pagination offset={offset} limit={limit} total={(data?.rows?.length ?? 0) >= limit ? (offset + limit + 1) : (offset + (data?.rows?.length ?? 0))} onChange={setOffset} />
    </>
  );
}
