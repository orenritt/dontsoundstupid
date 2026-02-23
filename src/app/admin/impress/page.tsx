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

interface ImpressRow {
  id: string;
  user_id: string;
  linkedin_url: string;
  name: string;
  title: string;
  company: string;
  photo_url: string;
  source: string;
  active: boolean;
  research_status: string;
  deep_dive_data: unknown;
  created_at: string;
  email: string;
  user_name: string;
}

const RESEARCH_COLORS: Record<string, "green" | "yellow" | "gray" | "blue"> = {
  none: "gray",
  pending: "yellow",
  in_progress: "blue",
  complete: "green",
};

export default function ImpressPage() {
  const { data, loading, error, refetch } = useAdminData<{ rows: ImpressRow[] }>("impress-contacts");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Impress Contacts"
        description="People users want to impress - enrichment and research status"
      />

      <DataTable
        columns={[
          { key: "name", label: "Name", render: (val) => <span className="text-white font-medium">{String(val || "-")}</span> },
          { key: "title", label: "Title", render: (val) => <span>{String(val || "-")}</span> },
          { key: "company", label: "Company" },
          { key: "active", label: "Active", render: (val) => val ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge> },
          { key: "research_status", label: "Research", render: (val) => <Badge color={RESEARCH_COLORS[String(val)] || "gray"}>{String(val)}</Badge> },
          { key: "source", label: "Source", render: (val) => <Badge>{String(val)}</Badge> },
          { key: "email", label: "Owner", render: (val) => <span className="text-white/40">{String(val)}</span> },
          { key: "linkedin_url", label: "LinkedIn", render: (val) => val ? (
            <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline max-w-[150px] block truncate" onClick={(e) => e.stopPropagation()}>
              {String(val).replace("https://www.linkedin.com/in/", "")}
            </a>
          ) : null },
          { key: "created_at", label: "Added", render: (val) => formatDate(val) },
        ]}
        rows={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
      />
    </>
  );
}
