"use client";

import {
  useAdminData,
  PageHeader,
  Badge,
  JsonViewer,
  LoadingState,
  ErrorState,
  formatDate,
} from "../components";
import { useState } from "react";

interface NewsletterRow {
  id: string;
  name: string;
  description: string;
  website_url: string;
  industry_tags: string[];
  ingestion_method: string;
  feed_url: string | null;
  syndication_feed_id: string | null;
  system_email_address: string | null;
  status: string;
  logo_url: string | null;
  last_email_received_at: string | null;
  created_at: string;
  updated_at: string;
  subscriber_count: number;
}

const STATUS_COLORS: Record<string, "green" | "yellow" | "red"> = {
  active: "green",
  pending_admin_setup: "yellow",
  inactive: "red",
};

export default function NewslettersPage() {
  const { data, loading, error, refetch } = useAdminData<{ rows: NewsletterRow[] }>("newsletters");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const rows = data?.rows ?? [];

  return (
    <>
      <PageHeader
        title="Newsletters"
        description="Newsletter registry with ingestion status and subscriptions"
      />

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/30 text-sm">
            No newsletters found
          </div>
        ) : (
          rows.map((nl) => (
            <div
              key={nl.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 cursor-pointer hover:bg-white/8 transition-colors"
              onClick={() => setExpandedId(expandedId === nl.id ? null : nl.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white">{nl.name}</h3>
                  <Badge color={STATUS_COLORS[nl.status] || "gray"}>{nl.status}</Badge>
                  <Badge>{nl.ingestion_method}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>{nl.subscriber_count} subscriber{Number(nl.subscriber_count) !== 1 ? "s" : ""}</span>
                  <span>{formatDate(nl.created_at)}</span>
                </div>
              </div>
              {nl.description && (
                <p className="text-sm text-white/40 mt-1">{nl.description}</p>
              )}
              {expandedId === nl.id && (
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-white/30">ID:</span>{" "}
                    <span className="text-white/50 font-mono">{nl.id}</span>
                  </div>
                  {nl.website_url && (
                    <div>
                      <span className="text-white/30">Website:</span>{" "}
                      <a href={nl.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {nl.website_url}
                      </a>
                    </div>
                  )}
                  {nl.feed_url && (
                    <div>
                      <span className="text-white/30">Feed URL:</span>{" "}
                      <span className="text-white/50">{nl.feed_url}</span>
                    </div>
                  )}
                  {nl.system_email_address && (
                    <div>
                      <span className="text-white/30">System Email:</span>{" "}
                      <span className="text-white/50">{nl.system_email_address}</span>
                    </div>
                  )}
                  {nl.last_email_received_at && (
                    <div>
                      <span className="text-white/30">Last Email:</span>{" "}
                      <span className="text-white/50">{formatDate(nl.last_email_received_at)}</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <JsonViewer data={nl.industry_tags} label="Industry Tags" />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
