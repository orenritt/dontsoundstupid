"use client";

import { motion } from "framer-motion";
import Link from "next/link";

function Orb() {
  return (
    <motion.div
      className="relative w-48 h-48 mx-auto mb-12"
      animate={{
        y: [0, -8, 0, 6, 0],
        rotate: [0, 1, -1, 0.5, 0],
        scale: [1, 1.02, 0.98, 1.01, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <circle
          cx="100"
          cy="100"
          r="60"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.5"
          strokeDasharray="4 6"
        />
        <circle
          cx="100"
          cy="100"
          r="40"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        <motion.circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
          strokeDasharray="8 12"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "100px 100px" }}
        />
      </svg>
    </motion.div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Orb />

      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-3">
        Don&apos;t Sound Stupid
      </h1>

      <p className="text-lg text-[var(--muted)] text-center mb-10">
        Never be the last to know.
      </p>

      <div className="flex gap-4">
        <Link
          href="/auth/signup"
          className="px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Sign Up
        </Link>
        <Link
          href="/auth/login"
          className="px-8 py-3 border border-white/30 text-white font-medium rounded-lg hover:border-white/60 transition-colors"
        >
          Log In
        </Link>
      </div>

      <motion.p
        className="mt-16 text-sm text-[var(--muted)] text-center max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1.5 }}
      >
        A personalized intelligence briefing. 5 things you need to know today,
        based on your exact job. Delivered daily so you&apos;re never caught off
        guard.
      </motion.p>
    </div>
  );
}
