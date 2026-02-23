"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface BriefingItem {
  id: string;
  reason: string;
  reasonLabel: string;
  topic: string;
  content: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  attribution: string | null;
}

interface Briefing {
  id: string;
  items: BriefingItem[];
  generatedAt: string;
}

interface PipelineProgress {
  running: boolean;
  stage?: string;
  message?: string;
  elapsedMs?: number;
  briefingId?: string | null;
  error?: string | null;
}

type PageState =
  | "loading"
  | "needs-onboarding"
  | "no-briefing"
  | "generating"
  | "has-briefing";

const STAGE_ORDER = [
  "starting",
  "loading-profile",
  "ingesting-news",
  "ai-research",
  "loading-signals",
  "scoring",
  "composing",
  "saving",
  "delivering",
  "done",
];

function stageProgress(stage?: string): number {
  if (!stage) return 0;
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

function formatElapsed(ms?: number): string {
  if (!ms) return "";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function BriefingPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, string>>(
    {}
  );
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((message: string) => {
    setToasts((prev) => [...prev, message]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 2000);
  }, []);

  useEffect(() => {
    loadPage();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function loadPage() {
    try {
      const [statusRes, briefingRes] = await Promise.all([
        fetch("/api/user/status"),
        fetch("/api/briefings/latest"),
      ]);

      if (!statusRes.ok) {
        setPageState("needs-onboarding");
        return;
      }

      const status = await statusRes.json();

      if (status.onboardingStatus !== "completed") {
        setPageState("needs-onboarding");
        return;
      }

      if (briefingRes.ok) {
        const data = await briefingRes.json();
        if (data.briefing) {
          setBriefing(data.briefing);
          setPageState("has-briefing");
          return;
        }
      }

      setPageState("no-briefing");
    } catch {
      setPageState("needs-onboarding");
    }
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/pipeline/status");
        if (!res.ok) return;
        const data: PipelineProgress = await res.json();
        setProgress(data);

        if (data.stage === "done") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          await loadPage();
        } else if (data.stage === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setGenerateError(data.error || "Pipeline failed. Please try again.");
          setPageState("no-briefing");
          setProgress(null);
        }
      } catch {
        // polling failure is non-critical, just retry next interval
      }
    }, 1500);
  }

  async function triggerPipeline() {
    setPageState("generating");
    setGenerateError(null);
    setProgress({ running: true, stage: "starting", message: "Starting pipeline..." });

    try {
      const res = await fetch("/api/pipeline/trigger", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setGenerateError(data.error || "Failed to start pipeline.");
        setPageState("no-briefing");
        setProgress(null);
        return;
      }
      startPolling();
    } catch {
      setGenerateError("Something went wrong. Please try again.");
      setPageState("no-briefing");
      setProgress(null);
    }
  }

  async function handleDeepDive(item: BriefingItem) {
    if (expandedItems[item.id]) return;
    const res = await fetch("/api/feedback/deep-dive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        briefingId: briefing!.id,
        itemId: item.id,
        topic: item.topic,
        content: item.content,
      }),
    });
    const data = await res.json();
    setExpandedItems((prev) => ({ ...prev, [item.id]: data.expanded }));
  }

  async function handleTune(item: BriefingItem, direction: "up" | "down") {
    await fetch("/api/feedback/tune", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        briefingId: briefing!.id,
        itemId: item.id,
        direction,
        topic: item.topic,
      }),
    });
    showToast(
      direction === "up" ? "More like this noted." : "Less like this noted."
    );
  }

  async function handleNotNovel(item: BriefingItem) {
    await fetch("/api/feedback/not-novel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        briefingId: briefing!.id,
        itemId: item.id,
        topic: item.topic,
      }),
    });
    setDismissedItems((prev) => new Set(prev).add(item.id));
  }

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (pageState === "needs-onboarding") {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Let&apos;s get to know you first
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Before we can build your briefing, we need to understand who you
            are, what you do, and what you need to stay sharp on.
          </p>
          <button
            onClick={() => router.push("/onboarding")}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Start Onboarding
          </button>
        </div>
      </div>
    );
  }

  if (pageState === "generating") {
    const pct = stageProgress(progress?.stage);
    const elapsed = formatElapsed(progress?.elapsedMs);

    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6">
        <div className="text-center max-w-sm w-full">
          <div className="mb-6">
            <div className="w-10 h-10 mx-auto mb-4 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            <h1 className="text-lg font-semibold text-gray-900 mb-1">
              Building your briefing
            </h1>
            <p className="text-gray-500 text-sm">
              {progress?.message || "Starting pipeline..."}
            </p>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
            <motion.div
              className="bg-gray-900 h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-400">
            <span>{pct}%</span>
            {elapsed && <span>{elapsed}</span>}
          </div>
        </div>
      </div>
    );
  }

  if (pageState === "no-briefing") {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to generate your first briefing
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Your profile is set up. Hit the button and we&apos;ll pull together
            5 things you should know today.
          </p>
          {generateError && (
            <p className="text-red-500 text-sm mb-4">{generateError}</p>
          )}
          <button
            onClick={triggerPipeline}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Generate My Briefing
          </button>
        </div>
      </div>
    );
  }

  const date = new Date(briefing!.generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-10">
          <p className="text-sm text-gray-400 mb-1">{date}</p>
          <h1 className="text-2xl font-bold text-gray-900">Your Briefing</h1>
        </header>

        <div className="space-y-3">
          <AnimatePresence>
            {briefing!.items.map(
              (item) =>
                !dismissedItems.has(item.id) && (
                  <motion.div
                    key={item.id}
                    layout
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"
                  >
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">
                      {item.reasonLabel}
                    </p>

                    <p className="text-gray-900 text-[15px] leading-relaxed">
                      {item.content}
                    </p>

                    {expandedItems[item.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-3 border-t border-gray-100"
                      >
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {expandedItems[item.id]}
                        </p>
                      </motion.div>
                    )}

                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-blue-500 hover:underline"
                      >
                        {item.sourceLabel || "Source"} →
                      </a>
                    )}

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => handleDeepDive(item)}
                        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                        title="Tell me more"
                      >
                        Tell me more
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => handleTune(item, "up")}
                        className="text-xs text-gray-400 hover:text-green-600 transition-colors"
                        title="More like this"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleTune(item, "down")}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        title="Less like this"
                      >
                        👎
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => handleNotNovel(item)}
                        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                        title="I already knew this"
                      >
                        I knew this
                      </button>
                    </div>
                  </motion.div>
                )
            )}
          </AnimatePresence>
        </div>

        {pageState === "has-briefing" && (
          <div className="mt-8 text-center">
            <button
              onClick={triggerPipeline}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Regenerate briefing
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {toasts.map((msg, i) => (
          <motion.div
            key={`${msg}-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg"
          >
            {msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
