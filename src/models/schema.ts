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

const expertiseLevelSchema = z.enum(["novice", "developing", "proficient", "expert"]);

const selfAssessmentSchema = z.object({
  category: intelligenceGoalCategorySchema,
  level: expertiseLevelSchema,
  assessedAt: z.string().datetime(),
});

const categoryScoringOverrideSchema = z.object({
  category: intelligenceGoalCategorySchema,
  relevanceMultiplier: z.number().positive(),
  noveltyThreshold: z.number().min(0).max(1),
  derivedFrom: expertiseLevelSchema,
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

const notNovelFeedbackSchema = z.object({
  type: z.literal("not-novel"),
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
  notNovelFeedbackSchema,
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
  selfAssessments: z.array(selfAssessmentSchema),
  snapshotAt: z.string().datetime(),
});

const contextLayerSchema = z.object({
  initiatives: z.array(initiativeSchema),
  concerns: z.array(concernSchema),
  topics: z.array(z.string()),
  knowledgeGaps: z.array(z.string()),
  intelligenceGoals: z.array(intelligenceGoalSchema),
  selfAssessments: z.array(selfAssessmentSchema),
  categoryScoringOverrides: z.array(categoryScoringOverrideSchema),
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

const briefingReasonSchema = z.enum([
  "people-are-talking",
  "meeting-prep",
  "new-entrant",
  "fundraise-or-deal",
  "regulatory-or-policy",
  "term-emerging",
  "network-activity",
  "your-space",
  "competitive-move",
  "event-upcoming",
  "other",
]);

const briefingItemSchema = z.object({
  id: z.string().uuid(),
  itemNumber: z.number().int().min(1).max(5),
  reason: briefingReasonSchema,
  reasonLabel: z.string(),
  topic: z.string(),
  content: z.string(),
  sourceUrl: z.string().url().nullable(),
  sourceLabel: z.string().nullable(),
  sourceSignalIds: z.array(z.string().uuid()),
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
  "email-forward",
  "news",
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
  "user-curated",
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

const feedTypeSchema = z.enum(["rss", "atom", "scrape"]);
const feedStatusSchema = z.enum(["active", "paused", "error", "discovery-pending"]);

export const feedSourceSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  domain: z.string(),
  feedType: feedTypeSchema,
  status: feedStatusSchema,
  pollIntervalMinutes: z.number().int().positive(),
  discoveredAt: z.string().datetime(),
});

export const feedSubscriptionSchema = z.object({
  id: z.string().uuid(),
  feedId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string(),
  subscribedAt: z.string().datetime(),
});

export const feedPollStateSchema = z.object({
  feedId: z.string().uuid(),
  lastFetchedAt: z.string().datetime().nullable(),
  lastItemDate: z.string().datetime().nullable(),
  lastContentHash: z.string().nullable(),
  consecutiveErrors: z.number().int(),
  lastErrorMessage: z.string().nullable(),
  nextPollAt: z.string().datetime(),
});

// Personal Graph schemas

const graphNodeTypeSchema = z.enum(["person", "organization"]);

const graphNodeSourceSchema = z.enum([
  "impress-list",
  "linkedin-connection",
  "auto-derived",
]);

const watchPrioritySchema = z.enum(["high", "medium", "low"]);

export const graphNodeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  nodeType: graphNodeTypeSchema,
  name: z.string(),
  enrichmentRef: z.string().nullable(),
  watchPriority: watchPrioritySchema,
  addedSource: graphNodeSourceSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const graphRelationshipTypeSchema = z.enum([
  "works-at",
  "connected-to",
  "mentioned-by",
]);

export const graphEdgeSchema = z.object({
  id: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  relationshipType: graphRelationshipTypeSchema,
  createdAt: z.string().datetime(),
});

const graphWatchTypeSchema = z.enum([
  "announcements",
  "fundraising",
  "hiring",
  "terms",
  "content",
]);

export const graphWatchSchema = z.object({
  id: z.string().uuid(),
  nodeId: z.string().uuid(),
  watchType: graphWatchTypeSchema,
  lastCheckedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

const graphActivityTypeSchema = z.enum([
  "new-term-usage",
  "announcement",
  "fundraising",
  "hiring",
  "topic-velocity",
]);

export const graphSignalSchema = z.object({
  activityType: graphActivityTypeSchema,
  nodeId: z.string().uuid(),
  nodeName: z.string(),
  details: z.record(z.string(), z.string()),
  detectedAt: z.string().datetime(),
});

export const personalGraphConfigSchema = z.object({
  enrichmentRefreshIntervalMs: z.number().int().positive(),
  maxWatchNodes: z.number().int().positive(),
  activityDetectionThreshold: z.number().positive(),
});

export type ValidatedGraphNode = z.infer<typeof graphNodeSchema>;
export type ValidatedGraphEdge = z.infer<typeof graphEdgeSchema>;
export type ValidatedGraphWatch = z.infer<typeof graphWatchSchema>;
export type ValidatedGraphSignal = z.infer<typeof graphSignalSchema>;

// -- Narrative Detection --

const narrativeSourceTypeSchema = z.enum([
  "news-api",
  "social-trends",
  "search-trends",
]);

export const narrativeSourceSchema = z.object({
  id: z.string().uuid(),
  type: narrativeSourceTypeSchema,
  config: z.record(z.string(), z.string()),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});

export const narrativeFrameSchema = z.object({
  id: z.string().uuid(),
  topicArea: z.string(),
  title: z.string(),
  description: z.string(),
  firstSeenAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  momentumScore: z.number(),
  adoptionCount: z.number().int().nonnegative(),
  relatedSignalIds: z.array(z.string().uuid()),
  metadata: z.record(z.string(), z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const termBurstSchema = z.object({
  id: z.string().uuid(),
  topicArea: z.string(),
  term: z.string(),
  frequencyDelta: z.number(),
  firstAppearance: z.string().datetime(),
  adoptionVelocity: z.number(),
  contextExamples: z.array(z.string()),
  sourceCount: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const narrativeAnalysisSchema = z.object({
  topicArea: z.string(),
  frames: z.array(narrativeFrameSchema),
  termBursts: z.array(termBurstSchema),
  analysisTimestamp: z.string().datetime(),
  llmModel: z.string(),
  signalCount: z.number().int().nonnegative(),
});

export const narrativeConfigSchema = z.object({
  llmProvider: z.string(),
  llmModel: z.string(),
  analysisFrequencyMinutes: z.number().int().positive(),
  minimumAdoptionThreshold: z.number().int().nonnegative(),
  minimumSignalCount: z.number().int().nonnegative(),
});

export type ValidatedNarrativeFrame = z.infer<typeof narrativeFrameSchema>;
export type ValidatedTermBurst = z.infer<typeof termBurstSchema>;
export type ValidatedNarrativeAnalysis = z.infer<typeof narrativeAnalysisSchema>;

const researchSourceTypeSchema = z.enum([
  "semantic-scholar",
  "arxiv",
  "pubmed",
  "preprint",
]);

const researchSourceStatusSchema = z.enum(["active", "disabled", "error"]);

const researchSourceApiConfigSchema = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().nullable(),
  rateLimitPerMinute: z.number().int().positive(),
  timeoutMs: z.number().int().positive(),
});

export const researchSourceSchema = z.object({
  id: z.string().uuid(),
  sourceType: researchSourceTypeSchema,
  name: z.string(),
  apiConfig: researchSourceApiConfigSchema,
  status: researchSourceStatusSchema,
  createdAt: z.string().datetime(),
});

const researchQueryDerivedFromSchema = z.enum([
  "intelligence-goal",
  "industry-topic",
  "context-keyword",
  "followed-author",
]);

export const researchIngestionQuerySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  queryText: z.string(),
  derivedFrom: researchQueryDerivedFromSchema,
  profileReference: z.string(),
  sourceType: researchSourceTypeSchema,
  contentHash: z.string(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});

export const researchResultSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string(),
  publicationDate: z.string().datetime(),
  citationCount: z.number().int().min(0),
  doi: z.string().nullable(),
  sourceApi: researchSourceTypeSchema,
  sourceUrl: z.string().url(),
  externalId: z.string(),
});

export const researchPollStateSchema = z.object({
  queryId: z.string().uuid(),
  sourceType: researchSourceTypeSchema,
  lastPolledAt: z.string().datetime().nullable(),
  lastQueryHash: z.string(),
  resultCount: z.number().int().min(0),
  consecutiveErrors: z.number().int().min(0),
  lastErrorMessage: z.string().nullable(),
  nextPollAt: z.string().datetime(),
});

// -- Events Ingestion --

const eventSourceTypeSchema = z.enum([
  "eventbrite",
  "luma",
  "meetup",
  "manual",
]);

const eventSourceStatusSchema = z.enum(["active", "paused", "error"]);

export const eventSourceSchema = z.object({
  id: z.string().uuid(),
  sourceType: eventSourceTypeSchema,
  name: z.string(),
  apiConfig: z.record(z.string(), z.string()),
  status: eventSourceStatusSchema,
  pollIntervalMinutes: z.number().int().positive(),
  createdAt: z.string().datetime(),
});

const eventTypeSchema = z.enum(["conference", "webinar", "meetup", "cfp"]);

const eventLocationSchema = z.object({
  venue: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  virtualUrl: z.string().nullable(),
  isVirtual: z.boolean(),
});

export const industryEventSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  externalId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  eventType: eventTypeSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
  location: eventLocationSchema,
  speakers: z.array(z.string()),
  topics: z.array(z.string()),
  registrationUrl: z.string().url().nullable(),
  ingestedAt: z.string().datetime(),
});

const eventDeltaTypeSchema = z.enum([
  "new-event",
  "theme-added",
  "speaker-change",
  "agenda-update",
]);

export const eventDeltaSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  deltaType: eventDeltaTypeSchema,
  previousValue: z.string().nullable(),
  newValue: z.string(),
  detectedAt: z.string().datetime(),
});

export const eventTrackerSchema = z.object({
  eventId: z.string().uuid(),
  lastPolledAt: z.string().datetime().nullable(),
  lastContentHash: z.string().nullable(),
  consecutiveErrors: z.number().int().min(0),
  lastErrorMessage: z.string().nullable(),
  nextPollAt: z.string().datetime(),
});

export type ValidatedEventSource = z.infer<typeof eventSourceSchema>;
export type ValidatedIndustryEvent = z.infer<typeof industryEventSchema>;
export type ValidatedEventDelta = z.infer<typeof eventDeltaSchema>;
export type ValidatedEventTracker = z.infer<typeof eventTrackerSchema>;

// -- Relevance Scoring --

const scoringFactorNameSchema = z.enum([
  "keyword-match",
  "semantic-similarity",
  "provenance",
  "goal-alignment",
  "feedback-boost",
  "freshness",
  "novelty",
]);

export const scoringFactorSchema = z.object({
  factor: scoringFactorNameSchema,
  weight: z.number().positive(),
  rawScore: z.number().min(0).max(1),
  weightedScore: z.number().min(0),
});

export const relevanceScoreSchema = z.object({
  signalId: z.string().uuid(),
  userId: z.string().uuid(),
  totalScore: z.number().min(0).max(1),
  factors: z.array(scoringFactorSchema),
  scoredAt: z.string().datetime(),
});

const factorWeightsSchema = z.object({
  "keyword-match": z.number().positive(),
  "semantic-similarity": z.number().positive(),
  "provenance": z.number().positive(),
  "goal-alignment": z.number().positive(),
  "feedback-boost": z.number().min(0),
  "freshness": z.number().positive(),
  "novelty": z.number().positive(),
});

export const scoringConfigSchema = z.object({
  factorWeights: factorWeightsSchema,
  minimumThreshold: z.number().min(0).max(1),
  noveltyMinimumThreshold: z.number().min(0).max(1),
  freshnessDecayRate: z.number().positive(),
  maxSignalsPerBriefing: z.number().int().positive(),
  noveltyMultiplicative: z.boolean(),
});

const relevanceScoredSignalSchema = z.object({
  signal: signalSchema,
  score: relevanceScoreSchema,
});

export const scoredSignalBatchSchema = z.object({
  userId: z.string().uuid(),
  scoringRunAt: z.string().datetime(),
  scoredSignals: z.array(relevanceScoredSignalSchema),
  aboveThreshold: z.array(relevanceScoredSignalSchema),
  belowThreshold: z.array(relevanceScoredSignalSchema),
});

export type ValidatedRelevanceScore = z.infer<typeof relevanceScoreSchema>;
export type ValidatedScoringConfig = z.infer<typeof scoringConfigSchema>;
export type ValidatedScoredSignalBatch = z.infer<typeof scoredSignalBatchSchema>;

// -- Briefing Composer --

const llmProviderSchema = z.enum(["openai", "anthropic"]);

export const composerConfigSchema = z.object({
  provider: llmProviderSchema,
  model: z.string(),
  maxTokens: z.number().int().positive(),
  temperature: z.number().min(0).max(2),
  targetItems: z.number().int().positive().default(5),
  maxSentencesPerItem: z.number().int().positive().default(2),
});

const scoredSignalRefSchema = z.object({
  signalId: z.string().uuid(),
  title: z.string(),
  summary: z.string(),
  relevanceScore: z.number(),
  noveltyScore: z.number().min(0).max(1),
  novelElements: z.array(z.string()),
  layer: z.string(),
  metadata: z.record(z.string(), z.string()),
});

const meetingContextSchema = z.object({
  meetingId: z.string(),
  title: z.string(),
  startTime: z.string().datetime(),
  attendeeSummaries: z.array(
    z.object({
      name: z.string(),
      role: z.string().nullable(),
      company: z.string().nullable(),
    })
  ),
  relevantSignalIds: z.array(z.string().uuid()),
  suggestedTalkingPoints: z.array(z.string()),
});

export const briefingPromptSchema = z.object({
  userId: z.string().uuid(),
  userContextSummary: z.string(),
  role: z.string(),
  company: z.string(),
  initiatives: z.array(z.string()),
  concerns: z.array(z.string()),
  intelligenceGoals: z.array(z.string()),
  scoredSignals: z.array(scoredSignalRefSchema),
  format: briefingFormatSchema,
  meetingContext: z.array(meetingContextSchema).nullable(),
});

const briefingSectionSchema = z.object({
  itemNumber: z.number().int().min(1).max(5),
  reason: briefingReasonSchema,
  reasonLabel: z.string(),
  title: z.string(),
  content: z.string(),
  sourceUrl: z.string().url().nullable(),
  sourceLabel: z.string().nullable(),
  sourceSignalIds: z.array(z.string().uuid()),
});

const briefingOutcomeSchema = z.enum(["delivered", "zero-briefing"]);

export const composedBriefingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  outcome: briefingOutcomeSchema,
  sections: z.array(briefingSectionSchema),
  meetingPrepSections: z.array(briefingSectionSchema).nullable(),
  format: briefingFormatSchema,
  modelUsed: z.string(),
  providerUsed: llmProviderSchema,
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  filteredByNoveltyCount: z.number().int().nonnegative(),
  generatedAt: z.string().datetime(),
});

const deliveryChannelTypeSchema = z.enum(["email", "slack", "sms", "whatsapp"]);
const deliveryStatusSchema = z.enum(["pending", "sent", "failed", "bounced"]);

export const deliveryAttemptSchema = z.object({
  id: z.string().uuid(),
  briefingId: z.string().uuid(),
  channel: deliveryChannelTypeSchema,
  status: deliveryStatusSchema,
  attemptNumber: z.number().int().positive(),
  attemptedAt: z.string().datetime(),
  errorMessage: z.string().nullable(),
});

export const briefingScheduleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  nextDeliveryAt: z.string().datetime(),
  timezone: z.string(),
  preferredTime: z.string(),
  lastDeliveredAt: z.string().datetime().nullable(),
  active: z.boolean(),
});

export type ValidatedComposedBriefing = z.infer<typeof composedBriefingSchema>;
export type ValidatedDeliveryAttempt = z.infer<typeof deliveryAttemptSchema>;
export type ValidatedBriefingSchedule = z.infer<typeof briefingScheduleSchema>;

// Knowledge graph and novelty

const knowledgeEntityTypeSchema = z.enum([
  "company",
  "person",
  "concept",
  "term",
  "product",
  "event",
  "fact",
]);

const knowledgeSourceSchema = z.enum([
  "profile-derived",
  "industry-scan",
  "briefing-delivered",
  "deep-dive",
  "feedback-implicit",
]);

export const knowledgeEntitySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  entityType: knowledgeEntityTypeSchema,
  name: z.string(),
  description: z.string(),
  source: knowledgeSourceSchema,
  confidence: z.number().min(0).max(1),
  knownSince: z.string().datetime(),
  lastReinforced: z.string().datetime(),
  embedding: z.array(z.number()).nullable(),
  embeddingModel: z.string().nullable(),
  relatedEntityIds: z.array(z.string().uuid()),
});

const knowledgeRelationshipSchema = z.enum([
  "works-at",
  "competes-with",
  "uses",
  "researches",
  "part-of",
  "related-to",
]);

export const knowledgeEdgeSchema = z.object({
  id: z.string().uuid(),
  sourceEntityId: z.string().uuid(),
  targetEntityId: z.string().uuid(),
  relationship: knowledgeRelationshipSchema,
});

export const exposureRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  signalId: z.string().uuid(),
  briefingId: z.string().uuid(),
  entityIds: z.array(z.string().uuid()),
  deliveredAt: z.string().datetime(),
  userEngaged: z.boolean(),
});

const noveltyFactorNameSchema = z.enum([
  "entity-overlap",
  "exposure-history",
  "temporal-check",
  "term-novelty-bonus",
]);

export const noveltyFactorSchema = z.object({
  factor: noveltyFactorNameSchema,
  rawScore: z.number().min(0).max(1),
  detail: z.string(),
});

export const noveltyScoreSchema = z.object({
  signalId: z.string().uuid(),
  userId: z.string().uuid(),
  totalNovelty: z.number().min(0).max(1),
  factors: z.array(noveltyFactorSchema),
  matchedKnownEntities: z.array(z.string()),
  novelElements: z.array(z.string()),
  scoredAt: z.string().datetime(),
});

const suggestedExpansionSchema = z.object({
  topicArea: z.string(),
  rationale: z.string(),
  filteredSignalCount: z.number().int(),
});

export const zeroBriefingResponseSchema = z.object({
  userId: z.string().uuid(),
  message: z.string(),
  refinementPrompt: z.string(),
  filteredSignalCount: z.number().int(),
  suggestedExpansions: z.array(suggestedExpansionSchema),
  generatedAt: z.string().datetime(),
});

export type ValidatedKnowledgeEntity = z.infer<typeof knowledgeEntitySchema>;
export type ValidatedKnowledgeEdge = z.infer<typeof knowledgeEdgeSchema>;
export type ValidatedExposureRecord = z.infer<typeof exposureRecordSchema>;
export type ValidatedNoveltyScore = z.infer<typeof noveltyScoreSchema>;
export type ValidatedZeroBriefingResponse = z.infer<typeof zeroBriefingResponseSchema>;

// Pipeline orchestrator

const pipelineStageSchema = z.enum([
  "ingestion",
  "scoring",
  "novelty-filtering",
  "composition",
  "delivery",
  "knowledge-update",
]);

const pipelineRunStatusSchema = z.enum([
  "scheduled",
  "running",
  "completed",
  "partial-failure",
  "failed",
]);

const stageOutcomeSchema = z.enum(["success", "partial-failure", "failure", "skipped"]);

export const pipelineStageResultSchema = z.object({
  stage: pipelineStageSchema,
  outcome: stageOutcomeSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  signalsProcessed: z.number().int().nonnegative(),
  signalsPassed: z.number().int().nonnegative(),
  errorMessage: z.string().nullable(),
});

const pipelineRunTypeSchema = z.enum(["daily", "t0-seeding", "retry", "manual"]);

export const pipelineRunSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: pipelineRunStatusSchema,
  runType: pipelineRunTypeSchema,
  stages: z.array(pipelineStageResultSchema),
  briefingId: z.string().uuid().nullable(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  errorMessage: z.string().nullable(),
});

export const pipelineScheduleEntrySchema = z.object({
  userId: z.string().uuid(),
  nextRunAt: z.string().datetime(),
  timezone: z.string(),
  pipelineLeadTimeMinutes: z.number().int().positive(),
  lastRunId: z.string().uuid().nullable(),
  lastRunAt: z.string().datetime().nullable(),
  active: z.boolean(),
});

export const ingestionCycleStateSchema = z.object({
  cycleId: z.string().uuid(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  layersCompleted: z.array(z.string()),
  layersFailed: z.array(z.string()),
  totalSignalsIngested: z.number().int().nonnegative(),
});

export type ValidatedPipelineRun = z.infer<typeof pipelineRunSchema>;
export type ValidatedPipelineScheduleEntry = z.infer<typeof pipelineScheduleEntrySchema>;
export type ValidatedIngestionCycleState = z.infer<typeof ingestionCycleStateSchema>;

// -- API Layer --

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
});

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const onboardingStepSubmissionSchema = z.object({
  stepId: z.string(),
  data: z.record(z.string(), z.unknown()),
});

export const updateContextRequestSchema = z.object({
  initiatives: z.array(initiativeSchema).optional(),
  concerns: z.array(concernSchema).optional(),
  topics: z.array(z.string()).optional(),
  knowledgeGaps: z.array(z.string()).optional(),
  intelligenceGoals: z.array(intelligenceGoalSchema).optional(),
  selfAssessments: z.array(selfAssessmentSchema).optional(),
});

export const updatePeersRequestSchema = z.object({
  add: z.array(peerOrganizationSchema).optional(),
  remove: z.array(z.string()).optional(),
  confirm: z.array(z.object({
    name: z.string(),
    confirmed: z.boolean(),
    comment: z.string().optional(),
  })).optional(),
});

export const addImpressContactRequestSchema = z.object({
  linkedinUrl: z.string().url(),
});

export const updateImpressContactRequestSchema = z.object({
  tier: z.enum(["core", "temporary"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const deepDiveFeedbackRequestSchema = z.object({
  type: z.literal("deep-dive"),
  briefingItemId: z.string().uuid(),
  topic: z.string(),
  category: z.string(),
});

const tuneMoreFeedbackRequestSchema = z.object({
  type: z.literal("tune-more"),
  briefingItemId: z.string().uuid(),
  topic: z.string(),
  category: z.string(),
  comment: z.string().optional(),
});

const tuneLessFeedbackRequestSchema = z.object({
  type: z.literal("tune-less"),
  briefingItemId: z.string().uuid(),
  topic: z.string(),
  category: z.string(),
  comment: z.string().optional(),
});

const notNovelFeedbackRequestSchema = z.object({
  type: z.literal("not-novel"),
  briefingItemId: z.string().uuid(),
  topic: z.string(),
  category: z.string(),
  comment: z.string().optional(),
});

export const feedbackSubmissionSchema = z.discriminatedUnion("type", [
  deepDiveFeedbackRequestSchema,
  tuneMoreFeedbackRequestSchema,
  tuneLessFeedbackRequestSchema,
  notNovelFeedbackRequestSchema,
]);

export const calendarConnectRequestSchema = z.object({
  provider: z.enum(["google", "outlook"]),
  authCode: z.string(),
});

export const addKnowledgeEntityRequestSchema = z.object({
  entityType: knowledgeEntityTypeSchema,
  name: z.string(),
  description: z.string(),
});

export const triggerPipelineRequestSchema = z.object({
  runType: z.literal("manual"),
});

export const updateDeliveryRequestSchema = z.object({
  channel: deliveryChannelSchema.optional(),
  preferredTime: z.string().optional(),
  timezone: z.string().optional(),
  format: briefingFormatSchema.optional(),
});

export const paginationParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

// -- Frontend Scaffold --

const onboardingStepSchema = z.enum([
  "linkedin-url",
  "impress-list",
  "conversation",
  "rapid-fire",
  "peer-org-review",
  "delivery-preferences",
  "calendar-connect",
]);

const onboardingLinkedinDataSchema = z.object({
  linkedinUrl: z.string(),
});

const onboardingImpressDataSchema = z.object({
  linkedinUrls: z.array(z.string()),
});

const onboardingConversationDataSchema = z.object({
  transcript: z.string(),
  inputMethod: z.enum(["text", "voice"]),
});

const rapidFireResponseSchema = z.enum(["know-tons", "need-more", "not-relevant"]);

const onboardingRapidFireItemSchema = z.object({
  topic: z.string(),
  context: z.string(),
  response: rapidFireResponseSchema,
});

const onboardingRapidFireDataSchema = z.object({
  classifications: z.array(onboardingRapidFireItemSchema),
});

const onboardingDeliveryDataSchema = z.object({
  channelType: z.enum(["email", "slack", "sms", "whatsapp"]),
  preferredTime: z.string(),
  timezone: z.string(),
  format: briefingFormatSchema,
});

const onboardingCalendarDataSchema = z.object({
  provider: z.enum(["google", "outlook"]).nullable(),
  connected: z.boolean(),
});

const onboardingPeerReviewDataSchema = z.object({
  confirmed: z.array(z.string()),
  rejected: z.array(z.string()),
  userAdded: z.array(z.string()),
});

const voiceInputStateSchema = z.object({
  isRecording: z.boolean(),
  isTranscribing: z.boolean(),
  transcript: z.string(),
  error: z.string().nullable(),
});

const onboardingStepDataSchema = z.object({
  "linkedin-url": onboardingLinkedinDataSchema.nullable(),
  "impress-list": onboardingImpressDataSchema.nullable(),
  "conversation": onboardingConversationDataSchema.nullable(),
  "rapid-fire": onboardingRapidFireDataSchema.nullable(),
  "peer-org-review": onboardingPeerReviewDataSchema.nullable(),
  "delivery-preferences": onboardingDeliveryDataSchema.nullable(),
  "calendar-connect": onboardingCalendarDataSchema.nullable(),
});

export const onboardingWizardStateSchema = z.object({
  currentStep: onboardingStepSchema,
  completedSteps: z.array(onboardingStepSchema),
  stepData: onboardingStepDataSchema,
  voiceInput: voiceInputStateSchema,
});

export const briefingViewStateSchema = z.object({
  currentBriefing: composedBriefingSchema.nullable(),
  zeroBriefing: zeroBriefingResponseSchema.nullable(),
  expandedSectionIds: z.array(z.string()),
  feedbackGiven: z.array(feedbackSignalSchema),
});

const navRouteSchema = z.enum([
  "/onboarding",
  "/briefing",
  "/settings",
  "/settings/context",
  "/settings/impress-list",
  "/settings/delivery",
  "/settings/calendar",
  "/knowledge",
  "/history",
]);

const uiNotificationTypeSchema = z.enum(["success", "error", "info"]);

export const uiNotificationSchema = z.object({
  id: z.string(),
  type: uiNotificationTypeSchema,
  message: z.string(),
  autoDismissMs: z.number().int().positive().nullable(),
});

export const themePreferenceSchema = z.enum(["light", "dark", "system"]);

export type ValidatedOnboardingWizardState = z.infer<typeof onboardingWizardStateSchema>;
export type ValidatedBriefingViewState = z.infer<typeof briefingViewStateSchema>;
export type ValidatedNavRoute = z.infer<typeof navRouteSchema>;
export type ValidatedUINotification = z.infer<typeof uiNotificationSchema>;
export type ValidatedThemePreference = z.infer<typeof themePreferenceSchema>;

// -- Channel Reply Processing --

const replyIntentSchema = z.enum([
  "deep-dive",
  "tune-more",
  "tune-less",
  "already-knew",
  "follow-up",
  "unrecognized",
]);

export const inboundReplySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  messageText: z.string(),
  channelType: deliveryChannelTypeSchema,
  threadRef: z.string().nullable(),
  receivedAt: z.string().datetime(),
});

export const intentClassificationSchema = z.object({
  intent: replyIntentSchema,
  itemNumber: z.number().int().min(1).max(5).nullable(),
  confidence: z.number().min(0).max(1),
  freeText: z.string(),
});

const conversationEntrySchema = z.object({
  role: z.enum(["user", "system"]),
  text: z.string(),
  timestamp: z.string().datetime(),
});

export const replySessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  briefingId: z.string().uuid(),
  briefingItems: z.array(briefingItemSchema),
  channelType: deliveryChannelTypeSchema,
  conversationHistory: z.array(conversationEntrySchema),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const replyResponseTypeSchema = z.enum([
  "deep-dive",
  "acknowledgment",
  "clarification",
  "help",
  "expired",
]);

export const replyResponseSchema = z.object({
  channelType: deliveryChannelTypeSchema,
  responseText: z.string(),
  itemRef: z.number().int().min(1).max(5).nullable(),
  responseType: replyResponseTypeSchema,
});

export type ValidatedInboundReply = z.infer<typeof inboundReplySchema>;
export type ValidatedIntentClassification = z.infer<typeof intentClassificationSchema>;
export type ValidatedReplySession = z.infer<typeof replySessionSchema>;
export type ValidatedReplyResponse = z.infer<typeof replyResponseSchema>;

// -- Email Forward Ingestion --

export const inboundEmailSchema = z.object({
  from: z.string().email(),
  to: z.string(),
  subject: z.string(),
  textBody: z.string().nullable(),
  htmlBody: z.string().nullable(),
  headers: z.record(z.string(), z.string()),
  receivedAt: z.string().datetime(),
});

export const parsedForwardSchema = z.object({
  userAnnotation: z.string().nullable(),
  forwardedContent: z.string(),
  originalSender: z.string().nullable(),
  subject: z.string(),
  extractedUrls: z.array(z.string().url()),
  primaryUrl: z.string().url().nullable(),
});

export const urlEnrichmentSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  fetchedAt: z.string().datetime(),
});

export const emailForwardSignalMetadataSchema = z.object({
  userAnnotation: z.string().nullable(),
  originalSender: z.string().nullable(),
  forwardedAt: z.string().datetime(),
  extractedUrls: z.array(z.string()),
  primaryUrlTitle: z.string().nullable(),
  primaryUrlDescription: z.string().nullable(),
});

export const emailForwardConfigSchema = z.object({
  maxForwardsPerUserPerDay: z.number().int().positive(),
  webhookSecret: z.string(),
  urlEnrichmentTimeoutMs: z.number().int().positive(),
});

export type ValidatedInboundEmail = z.infer<typeof inboundEmailSchema>;
export type ValidatedParsedForward = z.infer<typeof parsedForwardSchema>;
export type ValidatedUrlEnrichment = z.infer<typeof urlEnrichmentSchema>;
export type ValidatedEmailForwardSignalMetadata = z.infer<typeof emailForwardSignalMetadataSchema>;
