export type OnboardingStepId =
  | "user-linkedin"
  | "impress-list"
  | "conversation"
  | "peer-review"
  | "delivery-preferences"
  | "calendar-connect"
  | "complete";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  prompt: string;
  followUpPrompts?: string[];
  inputType: "url" | "url-list" | "conversation" | "peer-confirmation" | "delivery-selection" | "calendar-oauth" | "skip-or-connect";
}

export interface UserLinkedinInput {
  linkedinUrl: string;
}

export interface ImpressListInput {
  linkedinUrls: string[];
}

export interface IntelligenceGoalInput {
  category: string;
  detail: string | null;
}

export interface ConversationInput {
  currentWork: string;
  challenges: string;
  sharpTopics: string;
  embarrassments: string;
  intelligenceGoals: IntelligenceGoalInput[];
}

export interface PeerReviewInput {
  reviews: PeerReviewItem[];
  additionalOrgs: AdditionalOrg[];
}

export interface PeerReviewItem {
  orgName: string;
  confirmed: boolean;
  comment: string | null;
}

export interface AdditionalOrg {
  name: string;
  domain: string | null;
  comment: string | null;
}

export interface DeliveryPreferencesInput {
  channelType: "email" | "slack" | "sms" | "whatsapp";
  channelConfig: Record<string, string>;
  preferredTime: string;
  timezone: string;
  format: "concise" | "standard" | "detailed";
}

export interface CalendarConnectInput {
  connect: boolean;
  provider: "google" | "outlook" | null;
}

export type OnboardingInput =
  | { step: "user-linkedin"; data: UserLinkedinInput }
  | { step: "impress-list"; data: ImpressListInput }
  | { step: "conversation"; data: ConversationInput }
  | { step: "peer-review"; data: PeerReviewInput }
  | { step: "delivery-preferences"; data: DeliveryPreferencesInput }
  | { step: "calendar-connect"; data: CalendarConnectInput };
