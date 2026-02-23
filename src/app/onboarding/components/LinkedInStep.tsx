"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface LinkedInStepProps {
  onComplete: (data: { name: string; photoUrl: string }) => void;
  initialUrl?: string;
  initialName?: string;
  initialPhoto?: string;
}

export function LinkedInStep({ onComplete, initialUrl, initialName, initialPhoto }: LinkedInStepProps) {
  const [linkedinUrl, setLinkedinUrl] = useState(initialUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enriched, setEnriched] = useState<{ name: string; photoUrl: string } | null>(
    initialName && initialPhoto ? { name: initialName, photoUrl: initialPhoto } : null
  );

  const isValid = linkedinUrl.includes("linkedin.com/in/");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    if (enriched && linkedinUrl === initialUrl) {
      onComplete(enriched);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      const { name, photoUrl } = data.enriched || {};
      if (name && photoUrl) {
        setEnriched({ name, photoUrl });
        setTimeout(() => onComplete({ name, photoUrl }), 1500);
      } else {
        onComplete({ name: name || "User", photoUrl: photoUrl || "" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enrich profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <motion.div
        className="relative mb-8 flex items-center justify-center"
        animate={{
          y: [0, -8, 0, 6, 0],
          scale: [1, 1.02, 1, 1.01, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="relative">
          <svg width={200} height={200} viewBox="-100 -100 200 200" className="overflow-visible">
            {/* Rotating dashed ring r=80 */}
            <motion.g style={{ transformOrigin: "center" }}>
              <motion.circle
                cx={0}
                cy={0}
                r={80}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
                strokeDasharray="4 8"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
            </motion.g>
            {/* Outer circle r=80 */}
            <circle
              cx={0}
              cy={0}
              r={80}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
            {/* Middle dashed circle r=60 */}
            <circle
              cx={0}
              cy={0}
              r={60}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
              strokeDasharray="3 6"
            />
            {/* Inner circle r=40 */}
            <circle
              cx={0}
              cy={0}
              r={40}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          </svg>
          {/* User photo in center (when enriched) */}
          {enriched?.photoUrl && (
            <motion.div
              className="absolute left-1/2 top-1/2 h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-white/20"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <img
                src={enriched.photoUrl}
                alt={enriched.name}
                className="h-full w-full object-cover"
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      <h1 className="mb-6 text-center text-[28px] font-medium text-white">
        Who are you?
      </h1>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col items-center gap-4">
        <input
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="Paste your LinkedIn profile URL"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-gray-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
          disabled={loading}
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <motion.button
          type="submit"
          disabled={!isValid || loading}
          className="w-full rounded-lg bg-white px-6 py-3 font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          whileHover={isValid && !loading ? { scale: 1.02 } : {}}
          whileTap={isValid && !loading ? { scale: 0.98 } : {}}
        >
          {loading ? "Loading…" : "Next"}
        </motion.button>
      </form>
    </div>
  );
}
