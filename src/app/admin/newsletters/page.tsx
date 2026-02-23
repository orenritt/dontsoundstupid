"use client";

import {
  useAdminData,
  PageHeader,
  Badge,
  LoadingState,
  ErrorState,
  StatCard,
  formatDate,
} from "../components";
import { useState, useCallback, useEffect } from "react";

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

interface PendingItem {
  newsletter: NewsletterRow;
  requestCount: number;
}

interface SubscriberRow {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, "green" | "yellow" | "red"> = {
  active: "green",
  pending_admin_setup: "yellow",
  inactive: "red",
};

const INGESTION_COLORS: Record<string, "blue" | "purple" | "gray"> = {
  rss: "blue",
  system_email: "purple",
  pending: "gray",
};

type Tab = "all" | "pending" | "stale";

export default function NewslettersPage() {
  const { data, loading, error, refetch } = useAdminData<{
    rows: NewsletterRow[];
  }>("newsletters");
  const [tab, setTab] = useState<Tab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingData, setPendingData] = useState<{
    pending: PendingItem[];
    stale: NewsletterRow[];
  } | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [subscribers, setSubscribers] = useState<Record<string, SubscriberRow[]>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    websiteUrl: "",
    ingestionMethod: "rss" as "rss" | "system_email" | "pending",
    feedUrl: "",
    systemEmailSlug: "",
    industryTags: "",
  });

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/admin/newsletters/pending");
      if (res.ok) {
        const json = await res.json();
        setPendingData(json);
      }
    } catch {
      // silent
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const loadSubscribers = useCallback(async (newsletterId: string) => {
    try {
      const res = await fetch(
        `/api/admin/data-explorer?source=newsletter-subscribers&id=${newsletterId}`
      );
      if (res.ok) {
        const json = await res.json();
        setSubscribers((prev) => ({ ...prev, [newsletterId]: json.rows ?? [] }));
      }
    } catch {
      // silent
    }
  }, []);

  const handleExpand = useCallback(
    (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(id);
      if (!subscribers[id]) {
        loadSubscribers(id);
      }
    },
    [expandedId, subscribers, loadSubscribers]
  );

  const handleAdd = useCallback(async () => {
    if (!addForm.name.trim()) return;
    setActionLoading("add");
    try {
      const body: Record<string, unknown> = {
        name: addForm.name.trim(),
        description: addForm.description.trim(),
        websiteUrl: addForm.websiteUrl.trim() || null,
        ingestionMethod: addForm.ingestionMethod,
        industryTags: addForm.industryTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (addForm.ingestionMethod === "rss" && addForm.feedUrl.trim()) {
        body.feedUrl = addForm.feedUrl.trim();
      }
      if (
        addForm.ingestionMethod === "system_email" &&
        addForm.systemEmailSlug.trim()
      ) {
        body.systemEmailSlug = addForm.systemEmailSlug.trim();
      }

      const res = await fetch("/api/admin/newsletters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setAddForm({
          name: "",
          description: "",
          websiteUrl: "",
          ingestionMethod: "rss",
          feedUrl: "",
          systemEmailSlug: "",
          industryTags: "",
        });
        setShowAddForm(false);
        refetch();
        loadPending();
      }
    } finally {
      setActionLoading(null);
    }
  }, [addForm, refetch, loadPending]);

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      setActionLoading(id);
      try {
        await fetch("/api/admin/newsletters", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        refetch();
        loadPending();
      } finally {
        setActionLoading(null);
      }
    },
    [refetch, loadPending]
  );

  const handleSetupRss = useCallback(
    async (id: string, feedUrl: string) => {
      if (!feedUrl.trim()) return;
      setActionLoading(id);
      try {
        await fetch("/api/admin/newsletters", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, feedUrl: feedUrl.trim() }),
        });
        refetch();
        loadPending();
      } finally {
        setActionLoading(null);
      }
    },
    [refetch, loadPending]
  );

  const handleSetupEmail = useCallback(
    async (id: string, slug: string) => {
      if (!slug.trim()) return;
      setActionLoading(id);
      try {
        await fetch("/api/admin/newsletters", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, systemEmailSlug: slug.trim() }),
        });
        refetch();
        loadPending();
      } finally {
        setActionLoading(null);
      }
    },
    [refetch, loadPending]
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const rows = data?.rows ?? [];
  const pending = pendingData?.pending ?? [];
  const stale = pendingData?.stale ?? [];

  const activeCount = rows.filter((r) => r.status === "active").length;
  const pendingCount = pending.length;
  const staleCount = stale.length;
  const totalSubscribers = rows.reduce(
    (sum, r) => sum + Number(r.subscriber_count || 0),
    0
  );
  const rssCount = rows.filter((r) => r.ingestion_method === "rss").length;
  const emailCount = rows.filter(
    (r) => r.ingestion_method === "system_email"
  ).length;

  const displayRows =
    tab === "pending"
      ? pending.map((p) => p.newsletter)
      : tab === "stale"
        ? stale
        : rows;

  return (
    <>
      <PageHeader
        title="Newsletters & Subscriptions"
        description="Manage newsletter sources, Substack feeds, and user subscriptions"
      >
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          {showAddForm ? "Cancel" : "+ Add Newsletter"}
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total" value={rows.length} />
        <StatCard label="Active" value={activeCount} />
        <StatCard label="Pending Setup" value={pendingCount} />
        <StatCard label="Stale" value={staleCount} />
        <StatCard label="Subscribers" value={totalSubscribers} />
        <StatCard
          label="Ingestion"
          value={`${rssCount}R / ${emailCount}E`}
          sub="RSS / Email"
        />
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold mb-4">Add Newsletter</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1">Name *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Import AI by Jack Clark"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={addForm.websiteUrl}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, websiteUrl: e.target.value }))
                }
                placeholder="https://importai.substack.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-white/40 mb-1">
                Description
              </label>
              <input
                type="text"
                value={addForm.description}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Weekly newsletter about AI breakthroughs"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">
                Ingestion Method
              </label>
              <select
                value={addForm.ingestionMethod}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    ingestionMethod: e.target.value as
                      | "rss"
                      | "system_email"
                      | "pending",
                  }))
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
              >
                <option value="rss">RSS / Substack Feed</option>
                <option value="system_email">System Email</option>
                <option value="pending">Pending (decide later)</option>
              </select>
            </div>

            {addForm.ingestionMethod === "rss" && (
              <div>
                <label className="block text-xs text-white/40 mb-1">
                  Feed / Substack URL
                </label>
                <input
                  type="url"
                  value={addForm.feedUrl}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, feedUrl: e.target.value }))
                  }
                  placeholder="https://example.substack.com or RSS URL"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                />
                <p className="text-[10px] text-white/30 mt-1">
                  Substack URLs auto-detect — just paste the main URL
                </p>
              </div>
            )}

            {addForm.ingestionMethod === "system_email" && (
              <div>
                <label className="block text-xs text-white/40 mb-1">
                  Email Slug
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={addForm.systemEmailSlug}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        systemEmailSlug: e.target.value,
                      }))
                    }
                    placeholder="import-ai"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  />
                  <span className="text-xs text-white/30 whitespace-nowrap">
                    @newsletters.dontsoundstupid.com
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-white/40 mb-1">
                Industry Tags
              </label>
              <input
                type="text"
                value={addForm.industryTags}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, industryTags: e.target.value }))
                }
                placeholder="AI, Machine Learning, Tech"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
              />
              <p className="text-[10px] text-white/30 mt-1">Comma-separated</p>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleAdd}
              disabled={!addForm.name.trim() || actionLoading === "add"}
              className="px-6 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              {actionLoading === "add" ? "Adding..." : "Add Newsletter"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(
          [
            { key: "all", label: "All", count: rows.length },
            { key: "pending", label: "Pending Setup", count: pendingCount },
            { key: "stale", label: "Stale", count: staleCount },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white/15 text-white"
                : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-xs opacity-60">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Newsletter list */}
      {pendingLoading && tab !== "all" ? (
        <LoadingState />
      ) : (
        <div className="space-y-3">
          {displayRows.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/30 text-sm">
              {tab === "pending"
                ? "No newsletters pending setup"
                : tab === "stale"
                  ? "No stale newsletters detected"
                  : "No newsletters found"}
            </div>
          ) : (
            displayRows.map((nl) => (
              <NewsletterCard
                key={nl.id}
                newsletter={nl}
                expanded={expandedId === nl.id}
                onToggle={() => handleExpand(nl.id)}
                subscribers={subscribers[nl.id]}
                requestCount={
                  tab === "pending"
                    ? pending.find((p) => p.newsletter.id === nl.id)
                        ?.requestCount
                    : undefined
                }
                actionLoading={actionLoading === nl.id}
                onStatusChange={(status) => handleStatusChange(nl.id, status)}
                onSetupRss={(url) => handleSetupRss(nl.id, url)}
                onSetupEmail={(slug) => handleSetupEmail(nl.id, slug)}
              />
            ))
          )}
        </div>
      )}
    </>
  );
}

function NewsletterCard({
  newsletter: nl,
  expanded,
  onToggle,
  subscribers,
  requestCount,
  actionLoading,
  onStatusChange,
  onSetupRss,
  onSetupEmail,
}: {
  newsletter: NewsletterRow;
  expanded: boolean;
  onToggle: () => void;
  subscribers?: SubscriberRow[];
  requestCount?: number;
  actionLoading: boolean;
  onStatusChange: (status: string) => void;
  onSetupRss: (url: string) => void;
  onSetupEmail: (slug: string) => void;
}) {
  const [setupUrl, setSetupUrl] = useState("");
  const [setupSlug, setSetupSlug] = useState("");

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div
        className="p-5 cursor-pointer hover:bg-white/[0.03] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-white">{nl.name}</h3>
            <Badge color={STATUS_COLORS[nl.status] || "gray"}>
              {nl.status.replace(/_/g, " ")}
            </Badge>
            <Badge color={INGESTION_COLORS[nl.ingestion_method] || "gray"}>
              {nl.ingestion_method === "system_email"
                ? "email"
                : nl.ingestion_method}
            </Badge>
            {requestCount !== undefined && requestCount > 0 && (
              <Badge color="yellow">
                {requestCount} request{requestCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-white/40 shrink-0 ml-4">
            <span>
              {nl.subscriber_count} sub
              {Number(nl.subscriber_count) !== 1 ? "s" : ""}
            </span>
            <span>{formatDate(nl.created_at)}</span>
            <svg
              width={12}
              height={12}
              viewBox="0 0 12 12"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth={1.5}
                fill="none"
              />
            </svg>
          </div>
        </div>
        {nl.description && (
          <p className="text-sm text-white/40 mt-1">{nl.description}</p>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-5 space-y-5">
          {/* Detail grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <DetailField label="ID" value={nl.id} mono />
            {nl.website_url && (
              <DetailField label="Website" value={nl.website_url} link />
            )}
            {nl.feed_url && <DetailField label="Feed URL" value={nl.feed_url} />}
            {nl.system_email_address && (
              <DetailField
                label="System Email"
                value={nl.system_email_address}
              />
            )}
            {nl.last_email_received_at && (
              <DetailField
                label="Last Email"
                value={formatDate(nl.last_email_received_at)}
              />
            )}
            <DetailField label="Updated" value={formatDate(nl.updated_at)} />
            {nl.industry_tags && nl.industry_tags.length > 0 && (
              <div className="col-span-2 lg:col-span-3">
                <span className="text-white/30">Tags:</span>{" "}
                <span className="text-white/50">
                  {nl.industry_tags.join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Setup section for pending newsletters */}
          {nl.status === "pending_admin_setup" && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-400 mb-3">
                Setup Required
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">
                    Option 1: RSS / Substack URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={setupUrl}
                      onChange={(e) => setSetupUrl(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="https://example.substack.com or RSS feed URL"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetupRss(setupUrl);
                      }}
                      disabled={!setupUrl.trim() || actionLoading}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-500 disabled:opacity-40"
                    >
                      {actionLoading ? "..." : "Set RSS"}
                    </button>
                  </div>
                </div>
                <div className="text-center text-xs text-white/20">or</div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">
                    Option 2: System Email
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={setupSlug}
                      onChange={(e) => setSetupSlug(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="newsletter-slug"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                    />
                    <span className="text-xs text-white/30 whitespace-nowrap">
                      @newsletters.dontsoundstupid.com
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetupEmail(setupSlug);
                      }}
                      disabled={!setupSlug.trim() || actionLoading}
                      className="px-4 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-500 disabled:opacity-40"
                    >
                      {actionLoading ? "..." : "Set Email"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {nl.status === "active" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange("inactive");
                }}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20 disabled:opacity-40"
              >
                Deactivate
              </button>
            )}
            {nl.status === "inactive" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange("active");
                }}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs font-medium rounded-lg hover:bg-green-500/20 disabled:opacity-40"
              >
                Reactivate
              </button>
            )}
          </div>

          {/* Subscribers */}
          <div>
            <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Subscribers ({nl.subscriber_count})
            </h4>
            {!subscribers ? (
              <div className="text-xs text-white/30 animate-pulse">
                Loading subscribers...
              </div>
            ) : subscribers.length === 0 ? (
              <div className="text-xs text-white/30">No subscribers yet</div>
            ) : (
              <div className="bg-black/20 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-3 py-2 text-white/30 font-medium">
                        Email
                      </th>
                      <th className="text-left px-3 py-2 text-white/30 font-medium">
                        Name
                      </th>
                      <th className="text-left px-3 py-2 text-white/30 font-medium">
                        Subscribed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s.id} className="border-b border-white/5">
                        <td className="px-3 py-2 text-white/60">{s.email}</td>
                        <td className="px-3 py-2 text-white/60">
                          {s.name || "-"}
                        </td>
                        <td className="px-3 py-2 text-white/40">
                          {formatDate(s.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  link?: boolean;
}) {
  return (
    <div>
      <span className="text-white/30">{label}:</span>{" "}
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className={`text-white/50 ${mono ? "font-mono text-[11px]" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
