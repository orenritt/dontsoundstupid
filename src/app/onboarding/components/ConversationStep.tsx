"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ConversationStepProps {
  userName?: string;
  userPhoto?: string;
  onComplete: () => void;
}

function Orb({ size = 80, photoUrl, isPulsing = false }: { size?: number; photoUrl?: string; isPulsing?: boolean }) {
  const r = size / 2;
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={isPulsing ? { scale: [1, 1.08, 1] } : {}}
      transition={isPulsing ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <svg width={size + 40} height={size + 40} viewBox={`${-r - 20} ${-r - 20} ${size + 40} ${size + 40}`} className="overflow-visible">
        <circle
          cx={0}
          cy={0}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />
        <circle
          cx={0}
          cy={0}
          r={r * 0.75}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
          strokeDasharray="3 6"
        />
        <circle
          cx={0}
          cy={0}
          r={r * 0.5}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      </svg>
      {photoUrl && (
        <div
          className="absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/20"
          style={{ maxWidth: size * 0.76, maxHeight: size * 0.76 }}
        >
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
    </motion.div>
  );
}

export function ConversationStep({ userPhoto, onComplete }: ConversationStepProps) {
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = transcript.length >= 20;
  const inputMethod = recording ? "voice" : "text";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, inputMethod }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {/* Two orbs connected by line */}
      <div className="relative mb-8 flex flex-col items-center gap-4">
        {/* Top orb (user, smaller) */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ scale: 0.7 }}
        >
          <Orb size={100} photoUrl={userPhoto} />
        </motion.div>

        {/* Connecting line */}
        <motion.div
          className="h-8 w-px bg-white/20"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          style={{ transformOrigin: "top" }}
        />

        {/* Bottom orb (larger, new) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Orb size={140} isPulsing={recording} />
        </motion.div>
      </div>

      <h1 className="mb-2 text-center text-[24px] font-medium text-white">
        Tell me what you really do.
      </h1>
      <p className="mb-6 text-center text-base text-gray-500">
        No titles and BS. No generalities. What do you do all day?
      </p>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col items-center gap-4">
        <div className="relative w-full">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Describe your work, what you're expert in, what you wish you knew more about..."
            rows={4}
            className="min-h-[100px] w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-14 text-white placeholder:text-gray-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
            disabled={loading}
          />
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
            <motion.button
              type="button"
              onClick={() => setRecording(!recording)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {recording ? (
                <motion.span
                  className="h-3 w-3 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                </svg>
              )}
            </motion.button>
            <span className="text-[12px] text-gray-500">
              We recommend voice — people tend to share more.
            </span>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <motion.button
          type="submit"
          disabled={!isValid || loading}
          className="w-full rounded-lg bg-white px-6 py-3 font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          whileHover={isValid && !loading ? { scale: 1.02 } : {}}
          whileTap={isValid && !loading ? { scale: 0.98 } : {}}
        >
          {loading ? "Saving…" : "Next"}
        </motion.button>
      </form>
    </div>
  );
}
