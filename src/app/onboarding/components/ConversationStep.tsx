"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWhisper } from "@/hooks/use-whisper";

interface ConversationStepProps {
  userName?: string;
  userPhoto?: string;
  onComplete: () => void;
  onBack?: () => void;
  savedTranscript?: string;
}

const PROMPTS = [
  {
    question: "Walk me through a typical day.",
    subtext: "Not the calendar version. What actually eats your time and attention?",
    placeholder: "I usually start with… most of my day goes to… the hard part is…",
  },
  {
    question: "Tell me about a project you're deep in right now.",
    subtext: "What are you building, fixing, or figuring out? What's at stake?",
    placeholder: "Right now I'm working on… the goal is… the tricky part is…",
  },
  {
    question: "What do you wish you understood better?",
    subtext: "The stuff that makes you feel behind. The conversations where you nod but don't fully follow.",
    placeholder: "I wish I knew more about… I keep hearing about… I should probably understand…",
  },
  {
    question: "What tools or concepts do you wish you had a better grasp of?",
    subtext: "The things everyone else seems to get. The acronyms you quietly Google after meetings.",
    placeholder: "I keep running into… everyone talks about… I've been meaning to learn…",
  },
  {
    question: "What's one thing that caught you off guard recently?",
    subtext: "A news story, a meeting, a trend — something that made you think 'I should know more about this.'",
    placeholder: "Last week I was surprised by… I realized I didn't understand… it made me think…",
  },
];

type Phase = "answering" | "choosing" | "done";
type InputMode = "voice" | "typing";

function Orb({ size = 80, photoUrl, isPulsing = false }: { size?: number; photoUrl?: string; isPulsing?: boolean }) {
  const r = size / 2;
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={isPulsing ? { scale: [1, 1.08, 1] } : {}}
      transition={isPulsing ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <svg width={size + 40} height={size + 40} viewBox={`${-r - 20} ${-r - 20} ${size + 40} ${size + 40}`} className="overflow-visible">
        <circle cx={0} cy={0} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <circle cx={0} cy={0} r={r * 0.75} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="3 6" />
        <circle cx={0} cy={0} r={r * 0.5} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
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

function MicIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
    </svg>
  );
}

export function ConversationStep({ userPhoto, onComplete, onBack, savedTranscript }: ConversationStepProps) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [completedPairs, setCompletedPairs] = useState<{ question: string; answer: string }[]>([]);
  const [phase, setPhase] = useState<Phase>(savedTranscript ? "done" : "answering");
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [usedVoice, setUsedVoice] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(!!savedTranscript);

  const handleTranscript = useCallback((text: string) => {
    setCurrentAnswer(prev => {
      const separator = prev.length > 0 ? " " : "";
      return prev + separator + text;
    });
    setUsedVoice(true);
  }, []);

  const {
    recording,
    transcribing,
    error: whisperError,
    toggleRecording,
  } = useWhisper(handleTranscript);

  const error = whisperError || localError;

  useEffect(() => {
    if (savedTranscript && completedPairs.length === 0) {
      const pairs = savedTranscript.split("\n\n").map((block) => {
        const lines = block.split("\n");
        const question = lines[0]?.replace(/^Q:\s*/, "") ?? "";
        const answer = lines.slice(1).map(l => l.replace(/^A:\s*/, "")).join("\n");
        return { question, answer };
      }).filter(p => p.question && p.answer);
      if (pairs.length > 0) {
        setCompletedPairs(pairs);
        setPromptIndex(pairs.length);
      }
    }
  }, [savedTranscript, completedPairs.length]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentPrompt = PROMPTS[promptIndex];
  const canSubmitAnswer = currentAnswer.trim().length >= 10;
  const hasMorePrompts = promptIndex < PROMPTS.length - 1;
  const inputMethod = usedVoice ? "voice" : "text";

  useEffect(() => {
    if (phase === "answering" && inputMode === "typing") {
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [phase, promptIndex, inputMode]);

  const commitAnswer = useCallback(() => {
    if (!canSubmitAnswer) return;
    if (recording) toggleRecording();
    setCompletedPairs(prev => [...prev, {
      question: currentPrompt.question,
      answer: currentAnswer.trim(),
    }]);
    setCurrentAnswer("");
    setLocalError(null);

    if (hasMorePrompts) {
      setPhase("choosing");
    } else {
      setPhase("done");
    }
  }, [canSubmitAnswer, recording, toggleRecording, currentPrompt, currentAnswer, hasMorePrompts]);

  const handleAnotherQuestion = useCallback(() => {
    setPromptIndex(prev => prev + 1);
    setPhase("answering");
  }, []);

  const switchToTyping = useCallback(() => {
    if (recording) toggleRecording();
    setInputMode("typing");
  }, [recording, toggleRecording]);

  const submitAll = async () => {
    if (alreadySaved) {
      onComplete();
      return;
    }

    const allPairs = completedPairs;
    if (allPairs.length === 0 || loading) return;

    setLoading(true);
    setLocalError(null);

    const transcript = allPairs
      .map(p => `Q: ${p.question}\nA: ${p.answer}`)
      .join("\n\n");

    try {
      const res = await fetch("/api/onboarding/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, inputMethod }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setAlreadySaved(true);
      onComplete();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const showingVoiceMode = inputMode === "voice" && phase === "answering";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {/* Back button for conversation step */}
      {onBack && (
        <button
          onClick={onBack}
          className="fixed top-4 left-4 z-50 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
        </button>
      )}

      {/* Orbs */}
      <div className="relative mb-8 flex flex-col items-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ scale: 0.7 }}
        >
          <Orb size={100} photoUrl={userPhoto} />
        </motion.div>

        <motion.div
          className="h-8 w-px bg-white/20"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          style={{ transformOrigin: "top" }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Orb size={140} isPulsing={recording} />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "answering" && (
          <motion.div
            key={`answering-${promptIndex}-${inputMode}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="flex w-full max-w-md flex-col items-center"
          >
            {completedPairs.length > 0 && (
              <div className="mb-4 flex items-center gap-1.5 self-start">
                {completedPairs.map((_, i) => (
                  <div key={i} className="h-1 w-5 rounded-full bg-white/40" />
                ))}
                <div className="h-1 w-5 rounded-full bg-white" />
              </div>
            )}

            <h1 className="mb-2 text-center text-[24px] font-medium text-white">
              {currentPrompt.question}
            </h1>
            <p className="mb-8 max-w-md text-center text-base text-gray-500">
              {currentPrompt.subtext}
            </p>

            {showingVoiceMode ? (
              <>
                {/* Big centered mic button */}
                <div className="flex flex-col items-center gap-6">
                  <motion.button
                    type="button"
                    onClick={toggleRecording}
                    className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all ${
                      recording
                        ? "bg-red-500/20 text-red-400 shadow-[0_0_40px_rgba(239,68,68,0.25)]"
                        : "bg-white/10 text-white hover:bg-white/15 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                  >
                    {recording && (
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-red-500/40"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    {recording ? (
                      <motion.span
                        className="h-6 w-6 rounded-sm bg-red-400"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    ) : (
                      <MicIcon className="h-10 w-10" />
                    )}
                  </motion.button>

                  <p className="text-sm text-gray-500">
                    {recording
                      ? "Listening… tap to stop"
                      : transcribing
                        ? "Transcribing…"
                        : "Tap to start talking"}
                  </p>
                </div>

                {/* Transcript area */}
                {(currentAnswer || transcribing) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-sm text-white/80">
                      {currentAnswer}
                      {transcribing && (
                        <span className="text-white/40"> transcribing…</span>
                      )}
                    </p>
                  </motion.div>
                )}

                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

                {/* "Prefer to type" link + Done button row */}
                <div className="mt-6 flex w-full items-center gap-3">
                  <button
                    type="button"
                    onClick={switchToTyping}
                    className="shrink-0 rounded-lg border border-white/10 px-4 py-3 text-sm text-gray-400 transition-colors hover:border-white/20 hover:text-white/70"
                  >
                    I&apos;ll type instead
                  </button>
                  <motion.button
                    type="button"
                    disabled={!canSubmitAnswer || loading}
                    onClick={commitAnswer}
                    className="flex-1 rounded-lg bg-white px-6 py-3 font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    whileHover={canSubmitAnswer ? { scale: 1.02 } : {}}
                    whileTap={canSubmitAnswer ? { scale: 0.98 } : {}}
                  >
                    Done with this one
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                {/* Typing mode */}
                <div className="relative w-full">
                  <textarea
                    ref={textareaRef}
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder={currentPrompt.placeholder}
                    rows={5}
                    className="min-h-[120px] w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-gray-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmitAnswer) {
                        e.preventDefault();
                        commitAnswer();
                      }
                    }}
                  />
                </div>

                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

                <div className="mt-4 flex w-full items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setInputMode("voice")}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-gray-400 transition-colors hover:border-white/20 hover:text-white/70"
                  >
                    <MicIcon className="h-4 w-4" />
                    Use voice
                  </button>
                  <motion.button
                    type="button"
                    disabled={!canSubmitAnswer || loading}
                    onClick={commitAnswer}
                    className="flex-1 rounded-lg bg-white px-6 py-3 font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    whileHover={canSubmitAnswer ? { scale: 1.02 } : {}}
                    whileTap={canSubmitAnswer ? { scale: 0.98 } : {}}
                  >
                    Done with this one
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {phase === "choosing" && (
          <motion.div
            key="choosing"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="flex w-full max-w-md flex-col items-center"
          >
            <div className="mb-6 flex items-center gap-1.5">
              {completedPairs.map((_, i) => (
                <div key={i} className="h-1 w-5 rounded-full bg-white/40" />
              ))}
            </div>

            <h1 className="mb-2 text-center text-[24px] font-medium text-white">
              Nice. Want to tell me more?
            </h1>
            <p className="mb-8 max-w-sm text-center text-base text-gray-500">
              The more you share, the sharper your briefings. But no pressure.
            </p>

            <div className="flex w-full flex-col gap-3">
              <motion.button
                type="button"
                onClick={handleAnotherQuestion}
                className="w-full rounded-lg bg-white px-6 py-3 font-medium text-black"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Ask me another
              </motion.button>
              <motion.button
                type="button"
                onClick={submitAll}
                disabled={loading}
                className="w-full rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? "Saving…" : "That's enough — let's go"}
              </motion.button>
            </div>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="flex w-full max-w-md flex-col items-center"
          >
            <div className="mb-6 flex items-center gap-1.5">
              {completedPairs.map((_, i) => (
                <div key={i} className="h-1 w-5 rounded-full bg-white/40" />
              ))}
            </div>

            <h1 className="mb-2 text-center text-[24px] font-medium text-white">
              {alreadySaved ? "Your answers are saved." : "That was great. I\u2019ve got a lot to work with."}
            </h1>
            <p className="mb-8 text-center text-base text-gray-500">
              {alreadySaved ? "Continue or start fresh below." : "Let\u2019s keep going."}
            </p>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            <motion.button
              type="button"
              onClick={submitAll}
              disabled={loading}
              className="w-full rounded-lg bg-white px-6 py-3 font-medium text-black transition-opacity disabled:opacity-40"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? "Saving…" : "Next"}
            </motion.button>

            {alreadySaved && (
              <button
                type="button"
                onClick={() => {
                  setCompletedPairs([]);
                  setPromptIndex(0);
                  setPhase("answering");
                  setAlreadySaved(false);
                }}
                className="mt-4 text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                Start fresh
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
