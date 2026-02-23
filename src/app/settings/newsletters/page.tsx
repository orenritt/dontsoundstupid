"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Subscription {
  subscriptionId: string;
  subscribedAt: string;
  newsletter: {
    id: string;
    name: string;
    description: string;
    websiteUrl: string | null;
    status: string;
    logoUrl: string | null;
  };
}

interface AvailableNewsletter {
  id: string;
  name: string;
  description: string;
  websiteUrl: string | null;
  status: string;
}

export default function NewsletterSettingsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [available, setAvailable] = useState<AvailableNewsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrowse, setShowBrowse] = useState(false);
  const [submitInput, setSubmitInput] = useState("");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [myRes, allRes] = await Promise.all([
        fetch("/api/newsletters/my"),
        fetch("/api/newsletters"),
      ]);
      const myData = await myRes.json();
      const allData = await allRes.json();
      setSubscriptions(myData.subscriptions || []);
      setAvailable(allData.newsletters || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUnsubscribe = useCallback(
    async (newsletterId: string) => {
      setSubscriptions((prev) =>
        prev.filter((s) => s.newsletter.id !== newsletterId)
      );
      try {
        await fetch("/api/newsletters/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newsletterId }),
        });
      } catch {
        loadData();
      }
    },
    [loadData]
  );

  const handleSubscribe = useCallback(
    async (newsletterId: string) => {
      try {
        await fetch("/api/newsletters/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newsletterId }),
        });
        await loadData();
      } catch {
        // silent
      }
    },
    [loadData]
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
      setSubmitStatus(data.message || "Added!");
      setSubmitInput("");
      await loadData();
    } catch {
      setSubmitStatus("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }, [submitInput, submitting, loadData]);

  const subscribedIds = new Set(subscriptions.map((s) => s.newsletter.id));
  const unsubscribed = available.filter((n) => !subscribedIds.has(n.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12"
    >
      <h2 className="text-xl font-semibold mb-6">Content Universe</h2>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-white/5 border border-white/10 rounded-lg"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Subscribed newsletters */}
          {subscriptions.length === 0 ? (
            <p className="text-sm text-white/40 mb-8">
              No newsletters in your content universe yet.
            </p>
          ) : (
            <div className="space-y-3 mb-8">
              <AnimatePresence>
                {subscriptions.map((s) => (
                  <motion.div
                    key={s.newsletter.id}
                    layout
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-lg p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium">{s.newsletter.name}</h3>
                      {s.newsletter.description && (
                        <p className="text-xs text-white/50 mt-0.5 line-clamp-1">
                          {s.newsletter.description}
                        </p>
                      )}
                      <span
                        className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                          s.newsletter.status === "active"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {s.newsletter.status === "active"
                          ? "Active"
                          : "Pending setup"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnsubscribe(s.newsletter.id)}
                      className="shrink-0 text-xs text-white/40 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Add more */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-base font-medium mb-4">Add more</h3>

            {/* Custom submit */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <p className="text-xs text-white/50 mb-2">
                Paste a Substack/RSS URL or type a newsletter name
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={submitInput}
                  onChange={(e) => {
                    setSubmitInput(e.target.value);
                    setSubmitStatus(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="URL or newsletter name"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!submitInput.trim() || submitting}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-40"
                >
                  {submitting ? "..." : "Add"}
                </button>
              </div>
              {submitStatus && (
                <p className="mt-2 text-xs text-green-400">{submitStatus}</p>
              )}
            </div>

            {/* Browse available */}
            {unsubscribed.length > 0 && (
              <>
                <button
                  onClick={() => setShowBrowse(!showBrowse)}
                  className="text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  {showBrowse
                    ? "Hide available newsletters"
                    : `Browse ${unsubscribed.length} available newsletters`}
                </button>
                {showBrowse && (
                  <div className="mt-4 space-y-2">
                    {unsubscribed.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-lg p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium">{n.name}</h4>
                          {n.description && (
                            <p className="text-xs text-white/50 mt-0.5 line-clamp-1">
                              {n.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleSubscribe(n.id)}
                          className="shrink-0 px-3 py-1.5 text-xs font-medium bg-white text-black rounded-lg hover:bg-gray-200"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
