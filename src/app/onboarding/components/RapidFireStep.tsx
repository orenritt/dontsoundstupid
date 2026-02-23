"use client";

import { useState, useEffect, useCallback } from "react";
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
}

export function RapidFireStep({ onComplete }: RapidFireStepProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ready, setReady] = useState(false);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [exitDirection, setExitDirection] = useState(0);

  const pollRapidFire = useCallback(async () => {
    const res = await fetch("/api/onboarding/rapid-fire");
    const data = await res.json();
    if (data.ready && Array.isArray(data.topics) && data.topics.length > 0) {
      setTopics(data.topics);
      setReady(true);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const done = await pollRapidFire();
      if (done || cancelled) return;
      timeoutId = setTimeout(poll, 2000);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [pollRapidFire]);

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
          <p className="text-lg text-gray-900">
            Analyzing what you told me
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-block ml-1"
            >
              •
            </motion.span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="relative w-full max-w-lg mx-auto">
        <div className="absolute top-0 right-0 text-sm text-gray-500">
          {currentIndex + 1} of {topics.length}
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
