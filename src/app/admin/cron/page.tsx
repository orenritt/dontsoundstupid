"use client";

import { useState } from "react";
import { PageHeader, Badge, JsonViewer } from "../components";

interface JobDef {
  id: string;
  label: string;
  description: string;
  schedule: string;
  color: "blue" | "green" | "purple" | "yellow";
}

const JOBS: JobDef[] = [
  {
    id: "ingest",
    label: "Ingestion",
    description: "News, syndication feeds, AI research",
    schedule: "Daily",
    color: "blue",
  },
  {
    id: "daily",
    label: "Daily Briefing",
    description: "Score, filter, compose, and deliver briefings",
    schedule: "Daily",
    color: "green",
  },
  {
    id: "discover-feeds",
    label: "Feed Discovery",
    description: "Discover new RSS/Atom feeds for users",
    schedule: "Weekly (Sun)",
    color: "purple",
  },
  {
    id: "knowledge-gaps",
    label: "Knowledge Gap Scan",
    description: "LLM-powered scan for gaps in user knowledge graphs",
    schedule: "Biweekly (1st & 15th)",
    color: "yellow",
  },
  {
    id: "prune-knowledge",
    label: "Knowledge Graph Pruning",
    description: "Prune overly-general and irrelevant entities from knowledge graphs",
    schedule: "Weekly",
    color: "yellow",
  },
];

interface JobResult {
  job: string;
  durationMs: number;
  summary: Record<string, number>;
  results: Record<string, unknown>[];
}

interface HealthStage {
  stage: string;
  status: "pass" | "warn" | "fail";
  durationMs: number;
  details: Record<string, unknown>;
}

interface HealthResult {
  userId: string;
  email: string | null;
  stages: HealthStage[];
}

interface HealthCheck {
  timestamp: string;
  usersChecked: number;
  summary: { healthy: number; warnings: number; failing: number };
  results: HealthResult[];
}

const STATUS_COLORS = { pass: "text-green-400", warn: "text-yellow-400", fail: "text-red-400" };
const STATUS_LABELS = { pass: "PASS", warn: "WARN", fail: "FAIL" };

export default function CronPage() {
  const [running, setRunning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  async function runHealthCheck() {
    setHealthLoading(true);
    setHealthError(null);
    setHealthCheck(null);
    try {
      const res = await fetch("/api/admin/pipeline-test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setHealthCheck(data);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : String(err));
    } finally {
      setHealthLoading(false);
    }
  }

  async function triggerJob(jobId: string) {
    setRunning(jobId);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch("/api/admin/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: jobId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setLastResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Cron Jobs"
        description="Manually trigger scheduled jobs and inspect results"
      />

      <div className="mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Pipeline Live Test</h3>
              <p className="text-xs text-white/40 mt-0.5">Runs every pipeline stage live — ingests from APIs, scores with the LLM, reports pass/fail per stage with timing and errors. Does NOT compose or deliver.</p>
            </div>
            <button
              onClick={runHealthCheck}
              disabled={healthLoading}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${healthLoading ? "bg-white/10 text-white/50 cursor-wait" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 active:bg-blue-500/40 border border-blue-500/30"}`}
            >
              {healthLoading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
                  Testing...
                </span>
              ) : "Run Live Test"}
            </button>
          </div>

          {healthError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-3">
              <p className="text-sm text-red-400">{healthError}</p>
            </div>
          )}

          {healthCheck && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-white/30">Healthy</p>
                  <p className="text-lg font-bold text-green-400">{healthCheck.summary.healthy}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-white/30">Warnings</p>
                  <p className="text-lg font-bold text-yellow-400">{healthCheck.summary.warnings}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-white/30">Failing</p>
                  <p className="text-lg font-bold text-red-400">{healthCheck.summary.failing}</p>
                </div>
              </div>

              {healthCheck.results.map((r) => {
                const fails = r.stages.filter((s) => s.status === "fail").length;
                const warns = r.stages.filter((s) => s.status === "warn").length;
                const isExpanded = expandedUser === r.userId;

                return (
                  <div key={r.userId} className="bg-black/20 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : r.userId)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                      <span className="text-xs text-white/60">{r.email || r.userId.slice(0, 8)}</span>
                      <div className="flex items-center gap-3">
                        {r.stages.map((s) => (
                          <span key={s.stage} className={`text-[10px] font-mono ${STATUS_COLORS[s.status]}`}>
                            {s.stage}
                          </span>
                        ))}
                        <span className={`text-xs font-medium ${fails > 0 ? "text-red-400" : warns > 0 ? "text-yellow-400" : "text-green-400"}`}>
                          {fails > 0 ? `${fails} failing` : warns > 0 ? `${warns} warnings` : "healthy"}
                        </span>
                        <span className="text-white/20 text-xs">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2">
                        {r.stages.map((s) => (
                          <div key={s.stage} className="bg-black/30 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-white/80">{s.stage}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/20">{s.durationMs}ms</span>
                                <span className={`text-[10px] font-bold ${STATUS_COLORS[s.status]}`}>{STATUS_LABELS[s.status]}</span>
                              </div>
                            </div>
                            <pre className="text-[10px] text-white/40 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(s.details, null, 2)}</pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {JOBS.map((job) => {
          const isRunning = running === job.id;
          const isDisabled = running !== null;

          return (
            <div
              key={job.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {job.label}
                  </h3>
                  <Badge color={job.color}>{job.schedule}</Badge>
                </div>
              </div>

              <p className="text-xs text-white/40">{job.description}</p>

              <button
                onClick={() => triggerJob(job.id)}
                disabled={isDisabled}
                className={`
                  mt-auto px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    isRunning
                      ? "bg-white/10 text-white/50 cursor-wait"
                      : isDisabled
                        ? "bg-white/5 text-white/20 cursor-not-allowed"
                        : "bg-white/10 text-white hover:bg-white/20 active:bg-white/25"
                  }
                `}
              >
                {isRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
                    Running...
                  </span>
                ) : (
                  "Run Now"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {lastResult && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              Result:{" "}
              {JOBS.find((j) => j.id === lastResult.job)?.label ||
                lastResult.job}
            </h3>
            <span className="text-xs text-white/30">
              {(lastResult.durationMs / 1000).toFixed(1)}s
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {Object.entries(lastResult.summary).map(([key, value]) => (
              <div key={key} className="bg-black/20 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/30">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </p>
                <p
                  className={`text-lg font-bold mt-0.5 ${
                    key.toLowerCase().includes("error") && value > 0
                      ? "text-red-400"
                      : "text-white"
                  }`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {lastResult.results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/40 uppercase tracking-wider">
                Per-user results
              </p>
              <div className="max-h-[400px] overflow-y-auto space-y-1">
                {lastResult.results.map((r, i) => (
                  <div
                    key={i}
                    className="bg-black/20 rounded-lg px-4 py-3 flex items-center justify-between text-xs"
                  >
                    <span className="text-white/60">
                      {(r.email as string) ||
                        (r.userId as string)?.slice(0, 8)}
                    </span>
                    <div className="flex items-center gap-3">
                      {r.error ? (
                        <span className="text-red-400 max-w-[300px] truncate">
                          {String(r.error)}
                        </span>
                      ) : r.status ? (
                        <Badge
                          color={
                            r.status === "success"
                              ? "green"
                              : r.status === "error"
                                ? "red"
                                : "gray"
                          }
                        >
                          {String(r.status)}
                        </Badge>
                      ) : null}
                      {typeof r.gapsFound === "number" && (
                        <span className="text-white/40">
                          {r.gapsFound} gaps, {r.queriesAdded as number} queries,{" "}
                          {r.entitiesSeeded as number} entities
                        </span>
                      )}
                      {typeof r.pruned === "number" && (
                        <span className="text-white/40">
                          {r.pruned as number} pruned, {r.kept as number} kept,{" "}
                          {r.exempt as number} exempt
                        </span>
                      )}
                      {typeof r.feedsDiscovered === "number" && (
                        <span className="text-white/40">
                          {r.feedsDiscovered} feeds from{" "}
                          {r.sourcesAttempted as number} sources
                        </span>
                      )}
                      {typeof r.newsSignals === "number" && (
                        <span className="text-white/40">
                          {r.newsSignals} news, {r.syndicationSignals as number}{" "}
                          syn, {r.aiSignals as number} ai
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <JsonViewer data={lastResult} label="Raw response" />
        </div>
      )}
    </>
  );
}
