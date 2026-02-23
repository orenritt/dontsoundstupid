"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Suggestion {
  newsletterId: string;
  name: string;
  description: string;
  why: string;
  logoUrl: string | null;
}

interface NewsletterStepProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function NewsletterStep({ onComplete, onBack }: NewsletterStepProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [submitInput, setSubmitInput] = useState("");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/newsletters/suggestions")
      .then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleNewsletter = useCallback(
    async (newsletterId: string) => {
      const isAdded = added.has(newsletterId);

      setAdded((prev) => {
        const next = new Set(prev);
        if (isAdded) {
          next.delete(newsletterId);
        } else {
          next.add(newsletterId);
        }
        return next;
      });

      try {
        if (isAdded) {
          await fetch("/api/newsletters/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newsletterId }),
          });
        } else {
          await fetch("/api/newsletters/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newsletterId }),
          });
        }
      } catch {
        setAdded((prev) => {
          const next = new Set(prev);
          if (isAdded) {
            next.add(newsletterId);
          } else {
            next.delete(newsletterId);
          }
          return next;
        });
      }
    },
    [added]
  );

  const handleSubmit = useCallback(async () => {
    if (!submitInput.trim() || submitting) return;
    setSubmitting(true);
    setSubmitStatus(null);

    try {
      const res = await fetch("/api/newsletters/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: submitInput.trim() }),
      });
      const data = await res.json();

      if (data.newsletter?.id) {
        setAdded((prev) => new Set(prev).add(data.newsletter.id));
      }
      setSubmitStatus(data.message || "Added!");
      setSubmitInput("");
    } catch {
      setSubmitStatus("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [submitInput, submitting]);

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="w-full max-w-lg mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 12L6 8l4-4" />
            </svg>
            Back
          </button>
        )}

        <h2 className="text-2xl font-bold text-gray-900">
          Build your content universe
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Based on what you do, these newsletters might be worth pulling in.
        </p>

        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-100 bg-white p-5"
              >
                <div className="h-4 w-40 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-64 rounded bg-gray-100" />
                <div className="mt-2 h-3 w-48 rounded bg-gray-100" />
              </div>
            ))}
            <p className="text-center text-sm text-gray-400">
              Finding newsletters for you...
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <AnimatePresence>
              {suggestions.map((s, i) => {
                const isAdded = added.has(s.newsletterId);
                return (
                  <motion.div
                    key={s.newsletterId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-gray-900">
                          {s.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                          {s.why}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleNewsletter(s.newsletterId)}
                        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                          isAdded
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-gray-900 text-white hover:bg-gray-800"
                        }`}
                      >
                        {isAdded ? "Added \u2713" : "+ Add"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {suggestions.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">
                No newsletter suggestions yet. Add your own below.
              </p>
            )}
          </div>
        )}

        {/* Don't see yours? */}
        <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-700">
            Don&apos;t see yours?
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Paste a Substack or RSS URL, or just type the newsletter name.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={submitInput}
              onChange={(e) => {
                setSubmitInput(e.target.value);
                setSubmitStatus(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="URL or newsletter name"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!submitInput.trim() || submitting}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {submitting ? "..." : "Add"}
            </button>
          </div>
          {submitStatus && (
            <p className="mt-2 text-xs text-green-600">{submitStatus}</p>
          )}
        </div>

        <button
          onClick={onComplete}
          className="mt-8 w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
