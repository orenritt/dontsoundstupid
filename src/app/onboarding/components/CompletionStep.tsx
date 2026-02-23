"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface CompletionStepProps {
  onDashboard: () => void;
}

type Phase = "ready" | "seeding" | "generating" | "done";

const PHASE_LABELS: Record<Phase, string> = {
  ready: "Go to Your Dashboard",
  seeding: "Building your knowledge profile...",
  generating: "Generating your first briefing...",
  done: "Taking you to your briefing...",
};

export function CompletionStep({ onDashboard }: CompletionStepProps) {
  const [phase, setPhase] = useState<Phase>("ready");

  const handleGoToDashboard = async () => {
    setPhase("seeding");

    setTimeout(() => {
      setPhase("generating");
    }, 3000);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setPhase("done");
        setTimeout(onDashboard, 500);
      }
    } catch {
      onDashboard();
    }
  };

  const isWorking = phase !== "ready";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="max-w-lg mx-auto w-full text-center">
        <div className="mb-8 flex justify-center">
          <svg
            width={80}
            height={80}
            viewBox="0 0 80 80"
            fill="none"
            className="text-green-600"
          >
            <motion.path
              d="M20 40 L35 55 L60 25"
              stroke="currentColor"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </svg>
        </div>

        <h1 className="text-[28px] font-bold text-gray-900 mb-4">
          You&apos;re all set
        </h1>

        <p className="text-base text-gray-500 mb-8">
          I know who you are, what you do, who matters to you, and what you need
          to stay sharp on.
        </p>

        <button
          onClick={handleGoToDashboard}
          disabled={isWorking}
          className="w-full rounded-lg bg-gray-900 px-6 py-3 font-medium text-white disabled:opacity-50 transition-all"
        >
          {PHASE_LABELS[phase]}
        </button>

        {isWorking && phase !== "done" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400"
          >
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ●
            </motion.span>
            This takes about 30 seconds
          </motion.div>
        )}
      </div>
    </div>
  );
}
