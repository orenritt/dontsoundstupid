import type { UserProfile } from "./profile";
import type { Briefing } from "./briefing";
import type { ImpressList, ImpressContact, ImpressContactTier, ImpressContactStatus } from "./impress";
import type { PeerList, PeerOrganization } from "./peers";
import type { ContextLayer, Initiative, Concern, IntelligenceGoal } from "./context";
import type { DeliveryPreferences } from "./delivery";
import type { CalendarConnection, Meeting, MeetingIntelligence } from "./calendar";
import type { KnowledgeEntity, KnowledgeEntityType } from "./knowledge-graph";
import type { PipelineRun } from "./orchestrator";
import type { FeedbackSignal } from "./feedback";

// ---------------------------------------------------------------------------
// Generic Response Envelope
// ---------------------------------------------------------------------------

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  userId: string;
  tokens: AuthTokenPair;
}

export type LoginResponse = AuthTokenPair;

export type RefreshTokenResponse = AuthTokenPair;

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface StartOnboardingResponse {
  sessionId: string;
  currentStep: OnboardingStepInfo;
}

export interface OnboardingStepInfo {
  stepId: string;
  prompt: string;
  stepNumber: number;
  totalSteps: number;
}

export interface OnboardingStepSubmission {
  stepId: string;
  data: Record<string, unknown>;
}

export interface OnboardingStepResponse {
  completed: boolean;
  nextStep?: OnboardingStepInfo;
}

export interface OnboardingStatusResponse {
  currentStepId: string;
  currentStepNumber: number;
  totalSteps: number;
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export type GetProfileResponse = UserProfile;

export interface UpdateContextRequest {
  initiatives?: Initiative[];
  concerns?: Concern[];
  topics?: string[];
  knowledgeGaps?: string[];
  intelligenceGoals?: IntelligenceGoal[];
}

export type GetPeersResponse = PeerList;

export interface UpdatePeersRequest {
  add?: PeerOrganization[];
  remove?: string[];
  confirm?: { name: string; confirmed: boolean; comment?: string }[];
}

// ---------------------------------------------------------------------------
// Impress List
// ---------------------------------------------------------------------------

export type GetImpressListResponse = ImpressList;

export interface AddImpressContactRequest {
  linkedinUrl: string;
}

export type AddImpressContactResponse = ImpressContact;

export interface UpdateImpressContactRequest {
  tier?: ImpressContactTier;
  status?: ImpressContactStatus;
}

// ---------------------------------------------------------------------------
// Briefings
// ---------------------------------------------------------------------------

export type GetBriefingResponse = Briefing;

export type GetLatestBriefingResponse = Briefing;

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export interface DeepDiveFeedbackRequest {
  type: "deep-dive";
  briefingItemId: string;
  topic: string;
  category: string;
}

export interface TuneMoreFeedbackRequest {
  type: "tune-more";
  briefingItemId: string;
  topic: string;
  category: string;
  comment?: string;
}

export interface TuneLessFeedbackRequest {
  type: "tune-less";
  briefingItemId: string;
  topic: string;
  category: string;
  comment?: string;
}

export interface NotNovelFeedbackRequest {
  type: "not-novel";
  briefingItemId: string;
  topic: string;
  category: string;
  comment?: string;
}

export type FeedbackSubmission =
  | DeepDiveFeedbackRequest
  | TuneMoreFeedbackRequest
  | TuneLessFeedbackRequest
  | NotNovelFeedbackRequest;

export interface FeedbackResponse {
  recorded: boolean;
  feedbackId: string;
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarConnectRequest {
  provider: "google" | "outlook";
  authCode: string;
}

export type CalendarConnectResponse = CalendarConnection;

export interface CalendarMeetingsResponse {
  meetings: Meeting[];
  intelligence: MeetingIntelligence[];
}

// ---------------------------------------------------------------------------
// Knowledge Graph
// ---------------------------------------------------------------------------

export interface GetKnowledgeEntitiesParams {
  entityType?: KnowledgeEntityType;
  page?: number;
  pageSize?: number;
}

export interface AddKnowledgeEntityRequest {
  entityType: KnowledgeEntityType;
  name: string;
  description: string;
}

export type AddKnowledgeEntityResponse = KnowledgeEntity;

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface GetPipelineRunsParams {
  page?: number;
  pageSize?: number;
}

export interface TriggerPipelineRequest {
  runType: "manual";
}

export interface TriggerPipelineResponse {
  runId: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export interface UpdateDeliveryRequest {
  channel?: DeliveryPreferences["channel"];
  preferredTime?: string;
  timezone?: string;
  format?: DeliveryPreferences["format"];
}

export type UpdateDeliveryResponse = DeliveryPreferences;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
