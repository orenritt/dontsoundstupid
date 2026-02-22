import { ONBOARDING_STEPS } from "./script.js";
import type { OnboardingStepId } from "./steps.js";

export interface OnboardingState {
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  enrichmentReady: boolean;
  peerResearchReady: boolean;
}

export function createInitialState(): OnboardingState {
  return {
    currentStep: "user-linkedin",
    completedSteps: [],
    enrichmentReady: false,
    peerResearchReady: false,
  };
}

/**
 * Determines the next step based on current state.
 *
 * The flow is linear (steps 1-5), but step 4 (peer-review) can only
 * proceed once the system has finished researching peer organizations —
 * which requires both enrichment data AND conversation data.
 */
export function getNextStep(state: OnboardingState): OnboardingStepId | null {
  const stepOrder: OnboardingStepId[] = [
    "user-linkedin",
    "impress-list",
    "conversation",
    "peer-review",
    "calendar-connect",
    "delivery-preferences",
    "complete",
  ];

  const currentIndex = stepOrder.indexOf(state.currentStep);
  if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) {
    return null;
  }

  const nextStep = stepOrder[currentIndex + 1] as OnboardingStepId | undefined;
  if (!nextStep) {
    return null;
  }

  if (nextStep === "peer-review" && !state.peerResearchReady) {
    return null;
  }

  return nextStep;
}

export function getStepConfig(stepId: OnboardingStepId) {
  return ONBOARDING_STEPS.find((s) => s.id === stepId) ?? null;
}

export function canProceedToPeerReview(state: OnboardingState): boolean {
  return (
    state.enrichmentReady &&
    state.completedSteps.includes("conversation")
  );
}
