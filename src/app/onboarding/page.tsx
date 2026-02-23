"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LinkedInStep } from "./components/LinkedInStep";
import { ConversationStep } from "./components/ConversationStep";
import { ImpressListStep } from "./components/ImpressListStep";
import { RapidFireStep } from "./components/RapidFireStep";
import { PeerReviewStep } from "./components/PeerReviewStep";
import { DeliveryStep } from "./components/DeliveryStep";
import { CalendarStep } from "./components/CalendarStep";
import { NewsletterStep } from "./components/NewsletterStep";
import { CompletionStep } from "./components/CompletionStep";

type Step =
  | "linkedin"
  | "conversation"
  | "impress"
  | "rapid-fire"
  | "peer-review"
  | "delivery"
  | "calendar"
  | "newsletters"
  | "complete";

const STEP_ORDER: Step[] = [
  "linkedin",
  "conversation",
  "impress",
  "rapid-fire",
  "peer-review",
  "delivery",
  "calendar",
  "newsletters",
  "complete",
];

interface UserData {
  name?: string;
  photoUrl?: string;
  contacts: { name: string; photoUrl: string }[];
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("linkedin");
  const [userData, setUserData] = useState<UserData>({ contacts: [] });
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/onboarding/progress")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.resumeStep === "completed") {
          router.replace("/briefing");
          return;
        }
        setStep(data.resumeStep);
        if (data.userData) {
          setUserData({
            name: data.userData.name,
            photoUrl: data.userData.photoUrl,
            contacts: data.userData.contacts ?? [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const isOrbPhase = step === "linkedin" || step === "conversation" || step === "impress";

  const goNext = useCallback(
    (nextStep: Step) => {
      setStep(nextStep);
    },
    []
  );

  const goBack = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [step]);

  const startOver = useCallback(() => {
    setStep("linkedin");
    setUserData({ contacts: [] });
  }, []);

  const handleExit = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const confirmExit = useCallback(() => {
    router.push("/");
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isOrbPhase ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]"
      }`}
    >
      {/* Exit button — always visible except on completion */}
      {step !== "complete" && (
        <button
          onClick={handleExit}
          className={`fixed top-4 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isOrbPhase
              ? "text-white/40 hover:text-white/70 hover:bg-white/10"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
          }`}
          aria-label="Exit onboarding"
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}

      {/* Start-over link for orb phases */}
      {isOrbPhase && step !== "linkedin" && (
        <button
          onClick={startOver}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Start over
        </button>
      )}

      {/* Progress bar + back button for card phases */}
      {!isOrbPhase && step !== "complete" && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{
                width: `${
                  (["rapid-fire", "peer-review", "delivery", "calendar", "newsletters"].indexOf(
                    step
                  ) +
                    4) *
                  (100 / 8)
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Exit confirmation modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900">Leave onboarding?</h3>
              <p className="mt-2 text-sm text-gray-500">
                Your progress is saved. You can pick up where you left off.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Stay
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === "linkedin" && (
          <motion.div
            key="linkedin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <LinkedInStep
              onComplete={(data) => {
                setUserData((prev) => ({
                  ...prev,
                  name: data.name,
                  photoUrl: data.photoUrl,
                }));
                goNext("conversation");
              }}
            />
          </motion.div>
        )}

        {step === "conversation" && (
          <motion.div
            key="conversation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <ConversationStep
              userName={userData.name}
              userPhoto={userData.photoUrl}
              onComplete={() => goNext("impress")}
            />
          </motion.div>
        )}

        {step === "impress" && (
          <motion.div
            key="impress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
          >
            <ImpressListStep
              userPhoto={userData.photoUrl}
              onComplete={(contacts) => {
                setUserData((prev) => ({ ...prev, contacts }));
                goNext("rapid-fire");
              }}
            />
          </motion.div>
        )}

        {step === "rapid-fire" && (
          <motion.div
            key="rapid-fire"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <RapidFireStep
              onComplete={() => goNext("peer-review")}
              onBack={goBack}
            />
          </motion.div>
        )}

        {step === "peer-review" && (
          <motion.div
            key="peer-review"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <PeerReviewStep
              onComplete={() => goNext("delivery")}
              onBack={goBack}
            />
          </motion.div>
        )}

        {step === "delivery" && (
          <motion.div
            key="delivery"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <DeliveryStep
              onComplete={() => goNext("calendar")}
              onBack={goBack}
            />
          </motion.div>
        )}

        {step === "calendar" && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <CalendarStep
              onComplete={() => goNext("newsletters")}
              onBack={goBack}
            />
          </motion.div>
        )}

        {step === "newsletters" && (
          <motion.div
            key="newsletters"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <NewsletterStep
              onComplete={() => goNext("complete")}
              onBack={goBack}
            />
          </motion.div>
        )}

        {step === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CompletionStep
              onDashboard={() => router.push("/briefing")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
