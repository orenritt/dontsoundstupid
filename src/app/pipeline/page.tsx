"use client";

import { useState, useEffect, useRef } from "react";

interface StatusData {
  running: boolean;
  stage?: string;
  message?: string;
  elapsedMs?: number;
  briefingId?: string | null;
  error?: string | null;
}

interface LogEntry {
  time: string;
  stage: string;
  message: string;
  elapsedMs: number;
}

const STAGES = [
  { key: "starting", label: "Start" },
  { key: "loading-profile", label: "Profile" },
  { key: "loading-signals", label: "Signals" },
  { key: "scoring", label: "Scoring" },
  { key: "composing", label: "Compose" },
  { key: "saving", label: "Save" },
  { key: "delivering", label: "Deliver" },
  { key: "done", label: "Done" },
];

function stageIndex(stage?: string): number {
  if (!stage) return -1;
  return STAGES.findIndex((s) => s.key === stage);
}

function formatMs(ms?: number): string {
  if (!ms) return "0s";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function PipelinePage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [triggering, setTriggering] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStageRef = useRef<string>("");

  useEffect(() => {
    pollStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function pollStatus() {
    try {
      const res = await fetch("/api/pipeline/status");
      if (res.ok) {
        const data: StatusData = await res.json();
        setStatus(data);
        if (data.running && data.stage && data.stage !== lastStageRef.current) {
          lastStageRef.current = data.stage;
          addLogEntry(data);
        }
      }
    } catch {}
  }

  function addLogEntry(data: StatusData) {
    setLog((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        stage: data.stage || "unknown",
        message: data.message || "",
        elapsedMs: data.elapsedMs || 0,
      },
    ]);
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/pipeline/status");
        if (!res.ok) return;
        const data: StatusData = await res.json();
        setStatus(data);

        if (data.stage && data.stage !== lastStageRef.current) {
          lastStageRef.current = data.stage;
          addLogEntry(data);
        }

        if (!data.running) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          addLogEntry(data);
        }
      } catch {}
    }, 1000);
  }

  async function trigger() {
    setTriggering(true);
    setLog([]);
    lastStageRef.current = "";
    try {
      const res = await fetch("/api/pipeline/trigger", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setLog([{ time: new Date().toLocaleTimeString(), stage: "error", message: data.error || "Failed to trigger", elapsedMs: 0 }]);
        return;
      }
      setStatus({ running: true, stage: "starting", message: "Starting pipeline..." });
      addLogEntry({ running: true, stage: "starting", message: "Starting pipeline...", elapsedMs: 0 });
      startPolling();
    } catch (err) {
      setLog([{ time: new Date().toLocaleTimeString(), stage: "error", message: String(err), elapsedMs: 0 }]);
    } finally {
      setTriggering(false);
    }
  }

  const currentIdx = stageIndex(status?.stage);
  const isDone = status?.stage === "done";
  const isFailed = status?.stage === "failed";
  const isRunning = status?.running === true;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">Pipeline Status</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time pipeline monitoring</p>
          </div>
          <button
            onClick={trigger}
            disabled={triggering || isRunning}
            className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? "Running..." : triggering ? "Starting..." : "Trigger Pipeline"}
          </button>
        </div>

        {/* Stage indicators */}
        <div className="bg-gray-900 rounded-xl p-5 mb-6 border border-gray-800">
          <div className="flex items-center gap-1 mb-4">
            {STAGES.map((s, i) => {
              let color = "bg-gray-800 text-gray-600";
              if (isFailed && i <= currentIdx) color = "bg-red-900/50 text-red-400";
              else if (i < currentIdx) color = "bg-green-900/50 text-green-400";
              else if (i === currentIdx && isDone) color = "bg-green-900/50 text-green-400";
              else if (i === currentIdx) color = "bg-blue-900/50 text-blue-400 ring-1 ring-blue-500/50";
              return (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-full h-1.5 rounded-full ${
                    i < currentIdx || (i === currentIdx && isDone)
                      ? (isFailed ? "bg-red-500" : "bg-green-500")
                      : i === currentIdx
                        ? "bg-blue-500 animate-pulse"
                        : "bg-gray-800"
                  }`} />
                  <span className={`text-[10px] uppercase tracking-wider ${color} px-1.5 py-0.5 rounded`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className={`${isFailed ? "text-red-400" : isDone ? "text-green-400" : isRunning ? "text-blue-400" : "text-gray-500"}`}>
              {status?.message || "Idle — no pipeline running"}
            </span>
            {status?.elapsedMs !== undefined && status.elapsedMs > 0 && (
              <span className="text-gray-500">{formatMs(status.elapsedMs)}</span>
            )}
          </div>

          {isFailed && status?.error && (
            <div className="mt-3 p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-red-400 text-sm">
              {status.error}
            </div>
          )}

          {isDone && status?.briefingId && (
            <div className="mt-3 p-3 bg-green-950/50 border border-green-900/50 rounded-lg text-green-400 text-sm">
              Briefing created: <span className="font-medium">{status.briefingId}</span>
              <a href="/briefing" className="ml-3 underline hover:text-green-300">View →</a>
            </div>
          )}
        </div>

        {/* Live log */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-gray-500">Live Log</span>
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs text-blue-400">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-gray-600 text-sm">No activity yet. Click &quot;Trigger Pipeline&quot; to start.</p>
            ) : (
              <div className="space-y-1.5">
                {log.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-gray-600 shrink-0 w-20">{entry.time}</span>
                    <span className={`shrink-0 w-16 text-right ${
                      entry.stage === "done" ? "text-green-500" :
                      entry.stage === "failed" || entry.stage === "error" ? "text-red-500" :
                      "text-blue-400"
                    }`}>
                      {entry.stage}
                    </span>
                    <span className="text-gray-300">{entry.message}</span>
                    {entry.elapsedMs > 0 && (
                      <span className="text-gray-600 ml-auto shrink-0">+{formatMs(entry.elapsedMs)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
