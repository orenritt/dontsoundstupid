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

interface CalendarData {
  connections: Record<string, unknown>[];
  meetings: Record<string, unknown>[];
}

export default function CalendarAdminPage() {
  const { data, loading, error, refetch } = useAdminData<CalendarData>("calendar");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const connected = (data.connections || []).filter((c) => c.status === "connected");

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Calendar connections, meetings, and intelligence"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Connections" value={data.connections?.length ?? 0} />
        <StatCard label="Connected" value={connected.length} />
        <StatCard label="Upcoming Meetings" value={data.meetings?.length ?? 0} />
      </div>

      <h2 className="text-sm font-semibold text-white/60 mb-3">Connections</h2>
      <DataTable
        columns={[
          { key: "user_name", label: "User", render: (val, row) => String(val || row.email || "—") },
          { key: "provider", label: "Provider" },
          {
            key: "status",
            label: "Status",
            render: (val) => (
              <Badge color={val === "connected" ? "green" : "red"}>
                {String(val)}
              </Badge>
            ),
          },
          { key: "last_sync_at", label: "Last Sync", render: (val) => formatDate(val) },
          { key: "created_at", label: "Connected", render: (val) => formatDate(val) },
        ]}
        rows={data.connections || []}
        emptyMessage="No calendar connections yet."
      />

      <h2 className="text-sm font-semibold text-white/60 mb-3 mt-8">Upcoming Meetings</h2>
      <DataTable
        columns={[
          { key: "user_name", label: "User", render: (val, row) => String(val || row.email || "—") },
          { key: "title", label: "Meeting" },
          { key: "start_time", label: "Start", render: (val) => formatDate(val) },
          { key: "end_time", label: "End", render: (val) => formatDate(val) },
          { key: "attendee_count", label: "Attendees" },
          {
            key: "has_intelligence",
            label: "Intel",
            render: (val) => (
              <Badge color={Number(val) > 0 ? "green" : "gray"}>
                {Number(val) > 0 ? "Yes" : "No"}
              </Badge>
            ),
          },
          {
            key: "is_virtual",
            label: "Virtual",
            render: (val) => (val ? "Yes" : "No"),
          },
        ]}
        rows={data.meetings || []}
        emptyMessage="No upcoming meetings."
      />
    </>
  );
}
