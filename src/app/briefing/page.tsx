"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BriefingItem {
  id: string;
  reason: string;
  reasonLabel: string;
  topic: string;
  content: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
}

interface Briefing {
  id: string;
  items: BriefingItem[];
  generatedAt: string;
}

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, string>>(
    {}
  );
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<string[]>([]);

  const showToast = useCallback((message: string) => {
    setToasts((prev) => [...prev, message]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 2000);
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, []);

  async function fetchBriefing() {
    setLoading(true);
    const res = await fetch("/api/briefings/latest");
    const data = await res.json();
    setBriefing(data.briefing);
    setLoading(false);
  }

  async function triggerPipeline() {
    setGenerating(true);
    try {
      await fetch("/api/pipeline/trigger", { method: "POST" });
      await fetchBriefing();
    } finally {
      setGenerating(false);
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
    showToast(direction === "up" ? "More like this noted." : "Less like this noted.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📡</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Your first briefing is being prepared
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            We&apos;re analyzing your profile and gathering intelligence. This
            usually takes a minute.
          </p>
          <button
            onClick={triggerPipeline}
            disabled={generating}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Now"}
          </button>
        </div>
      </div>
    );
  }

  const date = new Date(briefing.generatedAt).toLocaleDateString("en-US", {
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

        <div className="space-y-1">
          <AnimatePresence>
            {briefing.items.map(
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

        <div className="mt-8 text-center">
          <button
            onClick={triggerPipeline}
            disabled={generating}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            {generating ? "Regenerating..." : "Regenerate briefing"}
          </button>
        </div>
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
