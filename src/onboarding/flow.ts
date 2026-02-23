import { ONBOARDING_STEPS } from "./script";
import type { OnboardingStepId } from "./steps";

export interface OnboardingState {
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  enrichmentReady: boolean;
  peerResearchReady: boolean;
  /** Set to true once the LLM has parsed the conversation transcript and generated rapid-fire topics. */
  rapidFireTopicsReady: boolean;
}

export function createInitialState(): OnboardingState {
  return {
    currentStep: "user-linkedin",
    completedSteps: [],
    enrichmentReady: false,
    peerResearchReady: false,
    rapidFireTopicsReady: false,
  };
}

/**
 * Determines the next step based on current state.
 *
 * Flow: linkedin → conversation → impress list → rapid-fire → peer review → delivery → calendar → complete
 *
 * Gates:
 * - rapid-fire waits for the system to parse the conversation transcript
 * - peer-review waits for enrichment + peer research to complete
 */
export function getNextStep(state: OnboardingState): OnboardingStepId | null {
  const stepOrder: OnboardingStepId[] = [
    "user-linkedin",
    "conversation",
    "impress-list",
    "rapid-fire",
    "peer-review",
    "delivery-preferences",
    "calendar-connect",
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

  if (nextStep === "rapid-fire" && !state.rapidFireTopicsReady) {
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
