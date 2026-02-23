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

interface ReplyData {
  sessions: Record<string, unknown>[];
  inboundReplies: Record<string, unknown>[];
}

export default function RepliesPage() {
  const { data, loading, error, refetch } = useAdminData<ReplyData>("reply-sessions");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const activeSessions = (data.sessions || []).filter((s) => s.active);

  return (
    <>
      <PageHeader
        title="Reply Sessions"
        description="Channel reply sessions and inbound message processing"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Sessions" value={data.sessions?.length ?? 0} />
        <StatCard label="Active" value={activeSessions.length} />
        <StatCard label="Inbound Replies" value={data.inboundReplies?.length ?? 0} />
      </div>

      <h2 className="text-sm font-semibold text-white/60 mb-3">Sessions</h2>
      <DataTable
        columns={[
          { key: "user_name", label: "User", render: (val, row) => String(val || row.email || "—") },
          { key: "channel_type", label: "Channel" },
          {
            key: "active",
            label: "Status",
            render: (val) => (
              <Badge color={val ? "green" : "gray"}>
                {val ? "Active" : "Expired"}
              </Badge>
            ),
          },
          { key: "message_count", label: "Messages" },
          { key: "created_at", label: "Created", render: (val) => formatDate(val) },
          { key: "expires_at", label: "Expires", render: (val) => formatDate(val) },
        ]}
        rows={data.sessions || []}
        emptyMessage="No reply sessions yet. Sessions are created when briefings are delivered."
      />

      <h2 className="text-sm font-semibold text-white/60 mb-3 mt-8">Inbound Replies</h2>
      <DataTable
        columns={[
          { key: "user_name", label: "User", render: (val, row) => String(val || row.email || "—") },
          { key: "channel_type", label: "Channel" },
          { key: "message_text", label: "Message" },
          {
            key: "classified_intent",
            label: "Intent",
            render: (val) => {
              const colors: Record<string, "blue" | "green" | "yellow" | "red" | "purple" | "gray"> = {
                "deep-dive": "blue",
                "tune-more": "green",
                "tune-less": "yellow",
                "already-knew": "purple",
                "follow-up": "gray",
                unrecognized: "red",
              };
              return val ? (
                <Badge color={colors[String(val)] || "gray"}>{String(val)}</Badge>
              ) : (
                <span className="text-white/20">—</span>
              );
            },
          },
          { key: "confidence", label: "Conf.", render: (val) => val ? `${(Number(val) * 100).toFixed(0)}%` : "—" },
          { key: "received_at", label: "Received", render: (val) => formatDate(val) },
        ]}
        rows={data.inboundReplies || []}
        emptyMessage="No inbound replies yet."
      />
    </>
  );
}
