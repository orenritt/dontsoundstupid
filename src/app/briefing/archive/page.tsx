"use client";

import { useState, useEffect } from "react";
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

interface ArchivedBriefing {
  id: string;
  items: BriefingItem[];
  createdAt: string;
  modelUsed: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDateKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function groupByDate(briefings: ArchivedBriefing[]) {
  const groups: Record<string, ArchivedBriefing[]> = {};
  for (const b of briefings) {
    const key = formatDateKey(b.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  }
  return Object.entries(groups);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse"
        >
          <div className="h-3 w-32 bg-white/10 rounded mb-3" />
          <div className="h-4 w-48 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function BriefingArchivePage() {
  const [briefings, setBriefings] = useState<ArchivedBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/briefings/archive")
      .then((r) => r.json())
      .then((data) => setBriefings(data.briefings ?? []))
      .finally(() => setLoading(false));
  }, []);

  const groups = groupByDate(briefings);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-2xl font-bold">Archive</h1>
          <p className="text-sm text-gray-500 mt-1">Your past briefings</p>
        </header>

        {loading ? (
          <LoadingSkeleton />
        ) : briefings.length === 0 ? (
          <p className="text-gray-500 text-sm">No briefings yet.</p>
        ) : (
          <div className="space-y-8">
            {groups.map(([dateKey, dayBriefings]) => (
              <section key={dateKey}>
                <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3">
                  {formatDate(dayBriefings[0].createdAt)}
                </h2>

                <div className="space-y-3">
                  {dayBriefings.map((b) => {
                    const isExpanded = expandedId === b.id;
                    return (
                      <div key={b.id}>
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : b.id)
                          }
                          className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/[0.08] transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {b.items.length} item
                                {b.items.length !== 1 ? "s" : ""}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {new Date(b.createdAt).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                            </div>
                            <svg
                              className={`w-4 h-4 text-gray-500 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 space-y-2 pl-4 border-l border-white/10">
                                {b.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="rounded-lg border border-white/5 bg-white/[0.03] p-4"
                                  >
                                    <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">
                                      {item.reasonLabel}
                                    </p>
                                    <p className="text-sm leading-relaxed text-gray-200">
                                      {item.content}
                                    </p>
                                    {item.sourceUrl && (
                                      <a
                                        href={item.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block mt-2 text-xs text-blue-400 hover:underline"
                                      >
                                        {item.sourceLabel || "Source"} &rarr;
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
