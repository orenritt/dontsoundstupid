import type { ComposedBriefing } from "./composer";
import type { ZeroBriefingResponse } from "./knowledge-graph";
import type { FeedbackSignal } from "./feedback";

export type OnboardingStep =
  | "linkedin-url"
  | "impress-list"
  | "conversation"
  | "rapid-fire"
  | "peer-org-review"
  | "delivery-preferences"
  | "calendar-connect";

export interface OnboardingLinkedinData {
  linkedinUrl: string;
}

export interface OnboardingImpressData {
  linkedinUrls: string[];
}

export interface OnboardingConversationData {
  transcript: string;
  inputMethod: "text" | "voice";
}

export type RapidFireResponseType = "know-tons" | "need-more" | "not-relevant";

export interface OnboardingRapidFireItem {
  topic: string;
  context: string;
  response: RapidFireResponseType;
}

export interface OnboardingRapidFireData {
  classifications: OnboardingRapidFireItem[];
}

export interface OnboardingDeliveryData {
  channelType: "email" | "slack" | "sms" | "whatsapp";
  preferredTime: string;
  timezone: string;
  format: "concise" | "standard" | "detailed";
}

export interface OnboardingCalendarData {
  provider: "google" | "outlook" | null;
  connected: boolean;
}

export interface OnboardingPeerReviewData {
  confirmed: string[];
  rejected: string[];
  userAdded: string[];
}

export interface VoiceInputState {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
}

export interface OnboardingStepData {
  "linkedin-url": OnboardingLinkedinData | null;
  "impress-list": OnboardingImpressData | null;
  "conversation": OnboardingConversationData | null;
  "rapid-fire": OnboardingRapidFireData | null;
  "peer-org-review": OnboardingPeerReviewData | null;
  "delivery-preferences": OnboardingDeliveryData | null;
  "calendar-connect": OnboardingCalendarData | null;
}

export interface OnboardingWizardState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  stepData: OnboardingStepData;
  voiceInput: VoiceInputState;
}

export interface BriefingViewState {
  currentBriefing: ComposedBriefing | null;
  zeroBriefing: ZeroBriefingResponse | null;
  expandedSectionIds: string[];
  feedbackGiven: FeedbackSignal[];
}

export type NavRoute =
  | "/onboarding"
  | "/briefing"
  | "/briefing/archive"
  | "/settings"
  | "/settings/context"
  | "/settings/impress-list"
  | "/settings/delivery"
  | "/settings/calendar"
  | "/knowledge"
  | "/history";

export type UINotificationType = "success" | "error" | "info";

export interface UINotification {
  id: string;
  type: UINotificationType;
  message: string;
  autoDismissMs: number | null;
}

export type ThemePreference = "light" | "dark" | "system";
