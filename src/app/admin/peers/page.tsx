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

interface PeerRow {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  description: string;
  confirmed: boolean | null;
  comment: string;
  source: string;
  created_at: string;
  email: string;
  user_name: string;
}

export default function PeersPage() {
  const { data, loading, error, refetch } = useAdminData<{ rows: PeerRow[] }>("peer-orgs");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Peer Organizations"
        description="Competitor and peer organizations tracked for each user"
      />

      <DataTable
        columns={[
          { key: "name", label: "Name", render: (val) => <span className="text-white font-medium">{String(val)}</span> },
          { key: "domain", label: "Domain", render: (val) => val ? (
            <a href={`https://${val}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {String(val)}
            </a>
          ) : null },
          { key: "description", label: "Description", render: (val) => <span className="max-w-[200px] block truncate">{String(val || "-")}</span> },
          { key: "confirmed", label: "Confirmed", render: (val) => {
            if (val === true) return <Badge color="green">Yes</Badge>;
            if (val === false) return <Badge color="red">No</Badge>;
            return <Badge color="gray">Pending</Badge>;
          }},
          { key: "source", label: "Source", render: (val) => <Badge>{String(val)}</Badge> },
          { key: "comment", label: "Comment", render: (val) => val ? <span className="max-w-[200px] block truncate">{String(val)}</span> : null },
          { key: "email", label: "Owner", render: (val) => <span className="text-white/40">{String(val)}</span> },
          { key: "created_at", label: "Added", render: (val) => formatDate(val) },
        ]}
        rows={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
      />
    </>
  );
}
