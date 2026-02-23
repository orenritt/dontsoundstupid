"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface CompletionStepProps {
  onDashboard: () => void;
}

export function CompletionStep({ onDashboard }: CompletionStepProps) {
  const [loading, setLoading] = useState(false);

  const handleGoToDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) onDashboard();
    } finally {
      setLoading(false);
    }
  };

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
          disabled={loading}
          className="w-full rounded-lg bg-gray-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Loading…" : "Go to Your Dashboard"}
        </button>
      </div>
    </div>
  );
}
