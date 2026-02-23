"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LinkedInStep } from "./components/LinkedInStep";
import { ConversationStep } from "./components/ConversationStep";
import { ImpressListStep } from "./components/ImpressListStep";
import { RapidFireStep } from "./components/RapidFireStep";
import { PeerReviewStep } from "./components/PeerReviewStep";
import { DeliveryStep } from "./components/DeliveryStep";
import { CalendarStep } from "./components/CalendarStep";
import { CompletionStep } from "./components/CompletionStep";

type Step =
  | "linkedin"
  | "conversation"
  | "impress"
  | "rapid-fire"
  | "peer-review"
  | "delivery"
  | "calendar"
  | "complete";

interface UserData {
  name?: string;
  photoUrl?: string;
  contacts: { name: string; photoUrl: string }[];
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("linkedin");
  const [userData, setUserData] = useState<UserData>({ contacts: [] });
  const router = useRouter();

  const isOrbPhase = step === "linkedin" || step === "conversation" || step === "impress";

  const goNext = useCallback(
    (nextStep: Step) => {
      setStep(nextStep);
    },
    []
  );

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isOrbPhase ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]"
      }`}
    >
      {!isOrbPhase && step !== "complete" && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
          <div
            className="h-full bg-black transition-all duration-500"
            style={{
              width: `${
                (["rapid-fire", "peer-review", "delivery", "calendar"].indexOf(
                  step
                ) +
                  4) *
                (100 / 7)
              }%`,
            }}
          />
        </div>
      )}

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
            <RapidFireStep onComplete={() => goNext("peer-review")} />
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
            <PeerReviewStep onComplete={() => goNext("delivery")} />
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
            <DeliveryStep onComplete={() => goNext("calendar")} />
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
            <CalendarStep onComplete={() => goNext("complete")} />
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
