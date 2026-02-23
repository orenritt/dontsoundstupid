import { z } from "zod";

const pastRoleSchema = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  description: z.string().nullable(),
});

const educationSchema = z.object({
  institution: z.string(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  endDate: z.string().nullable(),
});

const enrichedPersonSchema = z.object({
  linkedinUrl: z.string().url(),
  name: z.string(),
  headline: z.string(),
  currentRole: z.string(),
  currentCompany: z.string(),
  location: z.string(),
  skills: z.array(z.string()),
  pastRoles: z.array(pastRoleSchema),
  education: z.array(educationSchema),
  enrichedAt: z.string().datetime(),
});

const companySizeSchema = z.enum([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
]);

const jobPostingSchema = z.object({
  title: z.string(),
  department: z.string().nullable(),
  location: z.string().nullable(),
  postedDate: z.string().nullable(),
});

const companyEnrichmentSchema = z.object({
  name: z.string(),
  domain: z.string().nullable(),
  industry: z.string(),
  size: companySizeSchema,
  fundingStage: z.string().nullable(),
  techStack: z.array(z.string()),
  recentJobPostings: z.array(jobPostingSchema),
  enrichedAt: z.string().datetime(),
});

const identityLayerSchema = z.object({
  user: enrichedPersonSchema,
  company: companyEnrichmentSchema,
});

const impressContactSourceSchema = z.enum([
  "onboarding",
  "user-added",
  "promoted-from-calendar",
]);

const impressContactSchema = z.object({
  person: enrichedPersonSchema,
  source: impressContactSourceSchema,
  tier: z.enum(["core", "temporary"]),
  status: z.enum(["active", "inactive"]),
  linkedMeetingId: z.string().nullable(),
  activeFrom: z.string().datetime().nullable(),
  activeUntil: z.string().datetime().nullable(),
  addedAt: z.string().datetime(),
  removedAt: z.string().datetime().nullable(),
});

const impressListSchema = z.object({
  core: z.array(impressContactSchema),
  temporary: z.array(impressContactSchema),
});

const intelligenceGoalCategorySchema = z.enum([
  "industry-trends",
  "new-jargon",
  "new-entrants",
  "best-practices",
  "research",
  "regulatory",
  "competitive-intelligence",
  "network-intelligence",
  "custom",
]);

const intelligenceGoalSchema = z.object({
  category: intelligenceGoalCategorySchema,
  detail: z.string().nullable(),
  addedAt: z.string().datetime(),
  active: z.boolean(),
});

const deepDiveRequestSchema = z.object({
  type: z.literal("deep-dive"),
  briefingItemId: z.string().uuid(),
  topic: z.string(),
  category: z.string(),
  timestamp: z.string().datetime(),
});

const tuneMoreFeedbackSchema = z.object({
  type: z.literal("tune-more"),
  briefingItemId: z.string().uuid(),
  topic: z.string(),
  category: z.string(),
  comment: z.string().nullable(),
  timestamp: z.string().datetime(),
});

const tuneLessFeedbackSchema = z.object({
  type: z.literal("tune-less"),
  briefingItemId: z.string().uuid(),
  topic: z.string(),
  category: z.string(),
  comment: z.string().nullable(),
  timestamp: z.string().datetime(),
});

const feedbackSignalSchema = z.discriminatedUnion("type", [
  deepDiveRequestSchema,
  tuneMoreFeedbackSchema,
  tuneLessFeedbackSchema,
]);

const relevanceAdjustmentSchema = z.object({
  topic: z.string(),
  category: z.string(),
  weight: z.number(),
  signalCount: z.number(),
  lastUpdated: z.string().datetime(),
});

const feedbackHistorySchema = z.object({
  signals: z.array(feedbackSignalSchema),
  learnedAdjustments: z.array(relevanceAdjustmentSchema),
});

const initiativeSchema = z.object({
  description: z.string(),
  addedAt: z.string().datetime(),
  active: z.boolean(),
});

const concernSchema = z.object({
  description: z.string(),
  addedAt: z.string().datetime(),
  active: z.boolean(),
});

const contextSnapshotSchema = z.object({
  initiatives: z.array(initiativeSchema),
  concerns: z.array(concernSchema),
  topics: z.array(z.string()),
  knowledgeGaps: z.array(z.string()),
  intelligenceGoals: z.array(intelligenceGoalSchema),
  snapshotAt: z.string().datetime(),
});

const contextLayerSchema = z.object({
  initiatives: z.array(initiativeSchema),
  concerns: z.array(concernSchema),
  topics: z.array(z.string()),
  knowledgeGaps: z.array(z.string()),
  intelligenceGoals: z.array(intelligenceGoalSchema),
  geographicRelevance: z.array(z.string()),
  feedbackHistory: feedbackHistorySchema,
  updatedAt: z.string().datetime(),
  history: z.array(contextSnapshotSchema),
});

const peerSuggestionSchema = z.object({
  name: z.string(),
  domain: z.string().nullable(),
  industry: z.string(),
  reasoning: z.string(),
});

const peerOrganizationSchema = z.object({
  suggestion: peerSuggestionSchema,
  confirmed: z.boolean(),
  comment: z.string().nullable(),
  reviewedAt: z.string().datetime(),
});

const peerListSchema = z.object({
  organizations: z.array(peerOrganizationSchema),
  userAdded: z.array(peerOrganizationSchema),
  lastResearchedAt: z.string().datetime(),
});

const emailChannelSchema = z.object({
  type: z.literal("email"),
  address: z.string().email(),
});

const slackChannelSchema = z.object({
  type: z.literal("slack"),
  workspace: z.string(),
  channel: z.string(),
});

const smsChannelSchema = z.object({
  type: z.literal("sms"),
  phoneNumber: z.string(),
});

const whatsappChannelSchema = z.object({
  type: z.literal("whatsapp"),
  phoneNumber: z.string(),
});

const deliveryChannelSchema = z.discriminatedUnion("type", [
  emailChannelSchema,
  slackChannelSchema,
  smsChannelSchema,
  whatsappChannelSchema,
]);

const briefingFormatSchema = z.enum(["concise", "standard", "detailed"]);

const deliveryPreferencesSchema = z.object({
  channel: deliveryChannelSchema,
  preferredTime: z.string(),
  timezone: z.string(),
  format: briefingFormatSchema,
});

const googleCalendarSchema = z.object({
  provider: z.literal("google"),
  accessToken: z.string(),
  refreshToken: z.string(),
});

const outlookCalendarSchema = z.object({
  provider: z.literal("outlook"),
  accessToken: z.string(),
  refreshToken: z.string(),
});

const calendarProviderSchema = z.discriminatedUnion("provider", [
  googleCalendarSchema,
  outlookCalendarSchema,
]);

const calendarConnectionSchema = z.object({
  provider: calendarProviderSchema,
  status: z.enum(["connected", "disconnected"]),
  lastSyncAt: z.string().datetime().nullable(),
});

const meetingAttendeeSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  linkedinUrl: z.string().url().nullable(),
  role: z.string().nullable(),
  company: z.string().nullable(),
  enriched: z.boolean(),
});

const meetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  description: z.string().nullable(),
  attendees: z.array(meetingAttendeeSchema),
});

const attendeeSummarySchema = z.object({
  name: z.string(),
  role: z.string().nullable(),
  company: z.string().nullable(),
  recentActivity: z.array(z.string()),
  topicsTheyCareAbout: z.array(z.string()),
});

const meetingIntelligenceSchema = z.object({
  meetingId: z.string(),
  attendeeSummaries: z.array(attendeeSummarySchema),
  relevantNews: z.array(z.string()),
  suggestedTalkingPoints: z.array(z.string()),
  generatedAt: z.string().datetime(),
});

const briefingItemSchema = z.object({
  id: z.string().uuid(),
  topic: z.string(),
  category: z.string(),
  source: z.string(),
  summary: z.string(),
  content: z.string(),
  relevanceScore: z.number(),
  metadata: z.record(z.string(), z.string()),
});

const briefingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(briefingItemSchema),
  generatedAt: z.string().datetime(),
  deliveredAt: z.string().datetime().nullable(),
});

const calendarDataSchema = z.object({
  connection: calendarConnectionSchema.nullable(),
  upcomingMeetings: z.array(meetingSchema),
  meetingIntelligence: z.array(meetingIntelligenceSchema),
});

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  identity: identityLayerSchema,
  impressList: impressListSchema,
  context: contextLayerSchema,
  peers: peerListSchema,
  delivery: deliveryPreferencesSchema,
  calendar: calendarDataSchema.optional(),
  relevanceKeywords: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ValidatedUserProfile = z.infer<typeof userProfileSchema>;

const signalLayerSchema = z.enum([
  "syndication",
  "research",
  "narrative",
  "events",
  "personal-graph",
  "ai-research",
]);

const researchProviderSchema = z.enum(["perplexity", "tavily"]);

const queryDerivedFromSchema = z.enum([
  "intelligence-goal",
  "impress-list",
  "peer-org",
  "initiative",
  "industry",
  "deep-dive",
]);

const citationSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable(),
  snippet: z.string().nullable(),
});

export const researchQuerySchema = z.object({
  id: z.string().uuid(),
  queryText: z.string(),
  derivedFrom: queryDerivedFromSchema,
  profileReference: z.string(),
  provider: researchProviderSchema,
  templateId: z.string().nullable(),
  contentHash: z.string(),
  createdAt: z.string().datetime(),
});

export const researchResponseSchema = z.object({
  id: z.string().uuid(),
  queryId: z.string().uuid(),
  provider: researchProviderSchema,
  content: z.string(),
  citations: z.array(citationSchema),
  rawResponse: z.string(),
  receivedAt: z.string().datetime(),
});

export const signalSchema = z.object({
  id: z.string().uuid(),
  layer: signalLayerSchema,
  sourceUrl: z.string().url(),
  title: z.string(),
  content: z.string(),
  summary: z.string(),
  metadata: z.record(z.string(), z.string()),
  embedding: z.array(z.number()).nullable(),
  embeddingModel: z.string().nullable(),
  publishedAt: z.string().datetime(),
  ingestedAt: z.string().datetime(),
});

export const signalDedupSchema = z.object({
  signalId: z.string().uuid(),
  duplicateOfId: z.string().uuid(),
  similarity: z.number().min(0).max(1),
  detectedAt: z.string().datetime(),
});

const triggerReasonSchema = z.enum([
  "followed-org",
  "peer-org",
  "impress-list",
  "intelligence-goal",
  "industry-scan",
  "personal-graph",
]);

export const signalProvenanceSchema = z.object({
  id: z.string().uuid(),
  signalId: z.string().uuid(),
  userId: z.string().uuid(),
  triggerReason: triggerReasonSchema,
  profileReference: z.string(),
  createdAt: z.string().datetime(),
});

export type ValidatedSignal = z.infer<typeof signalSchema>;
export type ValidatedSignalProvenance = z.infer<typeof signalProvenanceSchema>;
