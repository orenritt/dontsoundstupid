"use client";

import Link from "next/link";
import {
  useAdminData,
  PageHeader,
  StatCard,
  LoadingState,
  ErrorState,
} from "./components";

interface OverviewData {
  signalsByLayer: { layer: string; count: string }[];
  users: string | number;
  briefings: string | number;
  feeds: string | number;
  newsQueries: string | number;
  newsletters: string | number;
  knowledgeEntities: string | number;
  feedbackSignals: string | number;
  pipelineRuns: string | number;
}

export default function AdminDashboard() {
  const { data, loading, error, refetch } = useAdminData<OverviewData>("overview");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const totalSignals =
    data.signalsByLayer?.reduce((sum, r) => sum + parseInt(String(r.count)), 0) ?? 0;

  const sources = [
    { label: "Signals", href: "/admin/signals", count: totalSignals, description: "All ingested content across layers" },
    { label: "News", href: "/admin/news", count: data.newsQueries, description: "NewsAPI.ai news queries and poll state" },
    { label: "Syndication", href: "/admin/syndication", count: data.feeds, description: "RSS/Atom feeds being polled" },
    { label: "Newsletters", href: "/admin/newsletters", count: data.newsletters, description: "Newsletter registry and subscriptions" },
    { label: "Briefings", href: "/admin/briefings", count: data.briefings, description: "Generated intelligence briefings" },
    { label: "Knowledge", href: "/admin/knowledge", count: data.knowledgeEntities, description: "Knowledge graph entities and edges" },
    { label: "Feedback", href: "/admin/feedback", count: data.feedbackSignals, description: "User feedback signals" },
    { label: "Pipeline", href: "/admin/pipeline", count: data.pipelineRuns, description: "Pipeline execution runs" },
    { label: "Users", href: "/admin/users", count: data.users, description: "User accounts and profiles" },
  ];

  return (
    <>
      <PageHeader
        title="Data Explorer"
        description="Inspect all data sources and system state"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Signals" value={totalSignals} />
        <StatCard label="Users" value={data.users} />
        <StatCard label="Briefings" value={data.briefings} />
        <StatCard label="Feedback" value={data.feedbackSignals} />
      </div>

      {data.signalsByLayer && data.signalsByLayer.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-white/60 mb-3">Signals by Layer</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.signalsByLayer.map((row) => (
              <Link
                key={row.layer}
                href={`/admin/signals?layer=${row.layer}`}
                className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/8 transition-colors group"
              >
                <p className="text-[10px] uppercase tracking-widest text-white/30 group-hover:text-white/50">
                  {row.layer}
                </p>
                <p className="text-xl font-bold mt-0.5">{row.count}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-white/60 mb-3">Explore Sources</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-colors group"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-white group-hover:text-white">
                {s.label}
              </h3>
              <span className="text-lg font-bold text-white/60">{String(s.count)}</span>
            </div>
            <p className="text-xs text-white/30">{s.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
