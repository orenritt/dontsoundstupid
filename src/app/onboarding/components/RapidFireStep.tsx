"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Topic {
  topic: string;
  context: string;
}

interface Classification {
  topic: string;
  context: string;
  response: "know-tons" | "need-more" | "not-relevant";
}

interface RapidFireStepProps {
  onComplete: () => void;
  onBack?: () => void;
}

const TIMEOUT_MS = 45_000;
const PROGRESS_TICK_MS = 200;

function useSimulatedProgress(active: boolean) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!active) return;
    startRef.current = Date.now();
    setProgress(0);

    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const t = Math.min(elapsed / TIMEOUT_MS, 1);
      // fast to ~40%, slows down, crawls near 95%
      const p = t < 0.3
        ? t * (40 / 0.3)
        : t < 0.7
          ? 40 + (t - 0.3) * (40 / 0.4)
          : 80 + (t - 0.7) * (15 / 0.3);
      setProgress(Math.min(p, 95));
    }, PROGRESS_TICK_MS);

    return () => clearInterval(id);
  }, [active]);

  const complete = useCallback(() => setProgress(100), []);
  const reset = useCallback(() => {
    startRef.current = Date.now();
    setProgress(0);
  }, []);

  return { progress, complete, reset };
}

export function RapidFireStep({ onComplete, onBack }: RapidFireStepProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [exitDirection, setExitDirection] = useState(0);
  const pollStartRef = useRef(Date.now());
  const pollKeyRef = useRef(0);

  const { progress, complete: completeProgress, reset: resetProgress } =
    useSimulatedProgress(!ready && !failed);

  const pollRapidFire = useCallback(async () => {
    const res = await fetch("/api/onboarding/rapid-fire");
    const data = await res.json();
    if (data.ready && Array.isArray(data.topics) && data.topics.length > 0) {
      setTopics(data.topics);
      completeProgress();
      setTimeout(() => setReady(true), 400);
      return "ready" as const;
    }
    if (data.failed) {
      return "failed" as const;
    }
    return "pending" as const;
  }, [completeProgress]);

  useEffect(() => {
    if (ready || failed) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const key = pollKeyRef.current;

    const poll = async () => {
      if (cancelled || key !== pollKeyRef.current) return;

      const result = await pollRapidFire();
      if (cancelled || key !== pollKeyRef.current) return;

      if (result === "ready") return;

      if (result === "failed" || Date.now() - pollStartRef.current > TIMEOUT_MS) {
        setFailed(true);
        return;
      }

      timeoutId = setTimeout(poll, 2000);
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [pollRapidFire, ready, failed]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/onboarding/rapid-fire", { method: "PATCH" });
      if (!res.ok) throw new Error("Retry failed");

      setFailed(false);
      pollStartRef.current = Date.now();
      pollKeyRef.current += 1;
      resetProgress();
    } catch {
      // stay in failed state
    } finally {
      setRetrying(false);
    }
  }, [resetProgress]);

  const handleChoice = (response: Classification["response"]) => {
    const topic = topics[currentIndex];
    if (!topic) return;

    const dir =
      response === "not-relevant" ? -1 : response === "know-tons" ? 1 : 0;
    setExitDirection(dir);

    setClassifications((prev) => [
      ...prev,
      { topic: topic.topic, context: topic.context, response },
    ]);
    setCurrentIndex((i) => i + 1);
  };

  const currentTopic = topics[currentIndex];
  const allClassified = currentIndex >= topics.length && topics.length > 0;

  useEffect(() => {
    if (!allClassified || submitting) return;

    const submit = async () => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/onboarding/rapid-fire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classifications }),
        });
        if (res.ok) onComplete();
      } finally {
        setSubmitting(false);
      }
    };
    submit();
  }, [allClassified, classifications, onComplete, submitting]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="max-w-lg mx-auto w-full text-center">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 12L6 8l4-4" />
              </svg>
              Back
            </button>
          )}

          {failed ? (
            <>
              <p className="text-lg text-gray-900 mb-2">
                Something went wrong while analyzing
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {"Don't worry — your answers are saved. Let's try again."}
              </p>
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {retrying ? "Retrying…" : "Try again"}
              </button>
            </>
          ) : (
            <>
              <p className="text-lg text-gray-900 mb-6">
                Analyzing what you told me
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block ml-1"
                >
                  •
                </motion.span>
              </p>

              <div className="w-full max-w-xs mx-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400">Processing</span>
                  <span className="text-xs tabular-nums text-gray-400">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gray-900"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="relative w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 12L6 8l4-4" />
              </svg>
              Back
            </button>
          ) : (
            <div />
          )}
          <span className="text-sm text-gray-500">
            {currentIndex + 1} of {topics.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {currentTopic ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: 0,
                x: exitDirection === -1 ? -80 : exitDirection === 1 ? 80 : 0,
                y: exitDirection === 0 ? 40 : 0,
              }}
              transition={{ duration: 0.25 }}
              className="mt-8"
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md mx-auto">
                <h2 className="text-[18px] font-bold text-gray-900 mb-2">
                  {currentTopic.topic}
                </h2>
                <p className="text-sm text-gray-500">{currentTopic.context}</p>
              </div>

              <div className="flex gap-3 justify-center mt-6">
                <button
                  onClick={() => handleChoice("not-relevant")}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Not relevant
                </button>
                <button
                  onClick={() => handleChoice("need-more")}
                  className="flex-1 rounded-lg border border-blue-500 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-500/20"
                >
                  Need more
                </button>
                <button
                  onClick={() => handleChoice("know-tons")}
                  className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Know tons
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center text-gray-500"
            >
              {submitting ? "Saving…" : "All done!"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
