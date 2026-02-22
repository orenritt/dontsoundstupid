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
  impressList: z.array(enrichedPersonSchema),
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

const calendarDataSchema = z.object({
  connection: calendarConnectionSchema.nullable(),
  upcomingMeetings: z.array(meetingSchema),
  meetingIntelligence: z.array(meetingIntelligenceSchema),
});

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  identity: identityLayerSchema,
  context: contextLayerSchema,
  peers: peerListSchema,
  delivery: deliveryPreferencesSchema,
  calendar: calendarDataSchema.optional(),
  relevanceKeywords: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ValidatedUserProfile = z.infer<typeof userProfileSchema>;
