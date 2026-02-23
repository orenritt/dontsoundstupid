"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConversationStepProps {
  userName?: string;
  userPhoto?: string;
  onComplete: () => void;
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

export function ConversationStep({ userPhoto, onComplete }: ConversationStepProps) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [completedPairs, setCompletedPairs] = useState<{ question: string; answer: string }[]>([]);
  const [phase, setPhase] = useState<Phase>("answering");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedVoice, setUsedVoice] = useState(false);
  const [livePartial, setLivePartial] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentPrompt = PROMPTS[promptIndex];
  const canSubmitAnswer = currentAnswer.trim().length >= 10;
  const hasMorePrompts = promptIndex < PROMPTS.length - 1;
  const inputMethod = usedVoice ? "voice" : "text";

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    setLivePartial("");
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        setCurrentAnswer(prev => {
          const separator = prev.length > 0 ? " " : "";
          return prev + separator + finalText.trim();
        });
        setUsedVoice(true);
      }
      setLivePartial(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access and try again.");
      } else if (event.error === "no-speech") {
        // Silence timeout — not a real error, restart automatically
        return;
      } else if (event.error !== "aborted") {
        setError(`Voice error: ${event.error}`);
      }
      stopRecording();
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          return;
        } catch {
          // Failed to restart — fall through to cleanup
        }
      }
      setRecording(false);
      setLivePartial("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      setError(`Voice error: ${err instanceof Error ? err.message : String(err)}`);
      recognitionRef.current = null;
      return;
    }
    setRecording(true);
    setError(null);
  }, [stopRecording]);

  const toggleRecording = useCallback(() => {
    if (recording) stopRecording();
    else startRecording();
  }, [recording, startRecording, stopRecording]);

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (phase === "answering") {
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [phase, promptIndex]);

  const commitAnswer = useCallback(() => {
    if (!canSubmitAnswer) return;
    stopRecording();
    setCompletedPairs(prev => [...prev, {
      question: currentPrompt.question,
      answer: currentAnswer.trim(),
    }]);
    setCurrentAnswer("");
    setError(null);

    if (hasMorePrompts) {
      setPhase("choosing");
    } else {
      setPhase("done");
    }
  }, [canSubmitAnswer, stopRecording, currentPrompt, currentAnswer, hasMorePrompts]);

  const handleAnotherQuestion = useCallback(() => {
    setPromptIndex(prev => prev + 1);
    setPhase("answering");
  }, []);

  const submitAll = async () => {
    const allPairs = phase === "done"
      ? completedPairs
      : completedPairs;

    if (allPairs.length === 0 || loading) return;

    setLoading(true);
    setError(null);

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
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
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
        {/* Phase: answering a question */}
        {phase === "answering" && (
          <motion.div
            key={`answering-${promptIndex}`}
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
            <p className="mb-6 max-w-md text-center text-base text-gray-500">
              {currentPrompt.subtext}
            </p>

            <div className="relative w-full">
              <textarea
                ref={textareaRef}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={currentPrompt.placeholder}
                rows={4}
                className="min-h-[100px] w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-14 text-white placeholder:text-gray-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmitAnswer) {
                    e.preventDefault();
                    commitAnswer();
                  }
                }}
              />
              <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
                <motion.button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors ${recording ? "bg-red-500/20 hover:bg-red-500/30" : "bg-white/10 hover:bg-white/20"}`}
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
                {completedPairs.length === 0 && (
                  <span className="text-[12px] text-gray-500">
                    Try voice — people share more.
                  </span>
                )}
              </div>
            </div>

            {livePartial && recording && (
              <p className="mt-3 w-full text-sm italic text-gray-400">{livePartial}</p>
            )}

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <motion.button
              type="button"
              disabled={!canSubmitAnswer || loading}
              onClick={commitAnswer}
              className="mt-4 w-full rounded-lg bg-white px-6 py-3 font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              whileHover={canSubmitAnswer ? { scale: 1.02 } : {}}
              whileTap={canSubmitAnswer ? { scale: 0.98 } : {}}
            >
              Done with this one
            </motion.button>
          </motion.div>
        )}

        {/* Phase: choose to continue or finish */}
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

        {/* Phase: ran out of prompts, auto-submit */}
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
              That was great. I&apos;ve got a lot to work with.
            </h1>
            <p className="mb-8 text-center text-base text-gray-500">
              Let&apos;s keep going.
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
