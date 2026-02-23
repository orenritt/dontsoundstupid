import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "not_started",
  "in_progress",
  "completed",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  linkedinUrl: text("linkedin_url"),
  linkedinPhotoUrl: text("linkedin_photo_url"),
  title: text("title"),
  company: text("company"),
  onboardingStatus: onboardingStatusEnum("onboarding_status")
    .notNull()
    .default("not_started"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  conversationTranscript: text("conversation_transcript"),
  conversationInputMethod: text("conversation_input_method"),
  parsedInitiatives: jsonb("parsed_initiatives").$type<string[]>().default([]),
  parsedConcerns: jsonb("parsed_concerns").$type<string[]>().default([]),
  parsedTopics: jsonb("parsed_topics").$type<string[]>().default([]),
  parsedKnowledgeGaps: jsonb("parsed_knowledge_gaps")
    .$type<string[]>()
    .default([]),
  parsedExpertAreas: jsonb("parsed_expert_areas").$type<string[]>().default([]),
  parsedWeakAreas: jsonb("parsed_weak_areas").$type<string[]>().default([]),
  rapidFireClassifications: jsonb("rapid_fire_classifications")
    .$type<{ topic: string; context: string; response: string }[]>()
    .default([]),
  deliveryChannel: text("delivery_channel"),
  deliveryTime: text("delivery_time"),
  deliveryTimezone: text("delivery_timezone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const impressContacts = pgTable(
  "impress_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    linkedinUrl: text("linkedin_url").notNull(),
    name: text("name"),
    title: text("title"),
    company: text("company"),
    photoUrl: text("photo_url"),
    source: text("source").notNull().default("onboarding"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_impress_user").on(table.userId)]
);

export const peerOrganizations = pgTable(
  "peer_organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    domain: text("domain"),
    description: text("description"),
    confirmed: boolean("confirmed"),
    comment: text("comment"),
    source: text("source").notNull().default("system-suggested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_peer_org_user").on(table.userId)]
);

export const knowledgeEntityTypeEnum = pgEnum("knowledge_entity_type", [
  "company",
  "person",
  "concept",
  "term",
  "product",
  "event",
  "fact",
]);

export const knowledgeSourceEnum = pgEnum("knowledge_source", [
  "profile-derived",
  "industry-scan",
  "briefing-delivered",
  "deep-dive",
  "feedback-implicit",
  "rapid-fire",
]);

export const knowledgeEntities = pgTable(
  "knowledge_entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    entityType: knowledgeEntityTypeEnum("entity_type").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    source: knowledgeSourceEnum("source").notNull(),
    confidence: real("confidence").notNull(),
    knownSince: timestamp("known_since", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastReinforced: timestamp("last_reinforced", { withTimezone: true })
      .notNull()
      .defaultNow(),
    embedding: jsonb("embedding").$type<number[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_ke_user").on(table.userId),
    uniqueIndex("idx_ke_user_name_type").on(
      table.userId,
      table.name,
      table.entityType
    ),
  ]
);

export const briefingReasonEnum = pgEnum("briefing_reason", [
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

export const briefings = pgTable(
  "briefings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    items: jsonb("items")
      .$type<
        {
          id: string;
          reason: string;
          reasonLabel: string;
          topic: string;
          content: string;
          sourceUrl: string | null;
          sourceLabel: string | null;
        }[]
      >()
      .notNull(),
    modelUsed: text("model_used").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_briefings_user").on(table.userId)]
);

export const feedbackSignals = pgTable(
  "feedback_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    briefingId: uuid("briefing_id")
      .notNull()
      .references(() => briefings.id),
    briefingItemId: text("briefing_item_id").notNull(),
    type: text("type").notNull(),
    topic: text("topic"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_feedback_user").on(table.userId),
    index("idx_feedback_briefing").on(table.briefingId),
  ]
);

export const calendarConnectionStatusEnum = pgEnum("calendar_connection_status", [
  "connected",
  "disconnected",
]);

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id)
      .unique(),
    provider: text("provider").notNull(),
    status: calendarConnectionStatusEnum("status").notNull().default("disconnected"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_cal_conn_user").on(table.userId)]
);

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    externalId: text("external_id"),
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }),
    location: text("location"),
    isVirtual: boolean("is_virtual").notNull().default(false),
    virtualUrl: text("virtual_url"),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_meetings_user").on(table.userId),
    index("idx_meetings_start").on(table.userId, table.startTime),
    uniqueIndex("idx_meetings_external").on(table.userId, table.externalId),
  ]
);

export const meetingAttendees = pgTable(
  "meeting_attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id),
    name: text("name"),
    email: text("email"),
    linkedinUrl: text("linkedin_url"),
    title: text("title"),
    company: text("company"),
    enriched: boolean("enriched").notNull().default(false),
    enrichmentData: jsonb("enrichment_data").$type<{
      headline: string | null;
      skills: string[];
      recentActivity: string[];
      topicsTheyCareAbout: string[];
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_attendee_meeting").on(table.meetingId),
  ]
);

export const meetingIntelligence = pgTable(
  "meeting_intelligence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id)
      .unique(),
    attendeeSummaries: jsonb("attendee_summaries")
      .$type<{
        name: string;
        role: string | null;
        company: string | null;
        recentActivity: string[];
        topicsTheyCareAbout: string[];
      }[]>()
      .notNull()
      .default([]),
    relevantTopics: jsonb("relevant_topics").$type<string[]>().notNull().default([]),
    suggestedTalkingPoints: jsonb("suggested_talking_points").$type<string[]>().notNull().default([]),
    modelUsed: text("model_used"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_meeting_intel_meeting").on(table.meetingId)]
);

// News ingestion (GDELT)

export const newsQueryDerivedFromEnum = pgEnum("news_query_derived_from", [
  "impress-list",
  "peer-org",
  "intelligence-goal",
  "industry",
]);

export const newsQueries = pgTable(
  "news_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    queryText: text("query_text").notNull(),
    derivedFrom: newsQueryDerivedFromEnum("derived_from").notNull(),
    profileReference: text("profile_reference").notNull(),
    contentHash: text("content_hash").notNull(),
    geographicFilters: jsonb("geographic_filters").$type<string[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_news_query").on(table.userId, table.contentHash),
    index("idx_news_queries_user").on(table.userId),
    index("idx_news_queries_active").on(table.userId, table.active),
    index("idx_news_queries_hash").on(table.contentHash),
  ]
);

export const newsPollState = pgTable(
  "news_poll_state",
  {
    queryId: uuid("query_id")
      .primaryKey()
      .references(() => newsQueries.id),
    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    resultCount: integer("result_count").notNull().default(0),
    consecutiveErrors: integer("consecutive_errors").notNull().default(0),
    lastErrorMessage: text("last_error_message"),
    nextPollAt: timestamp("next_poll_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_news_poll_next").on(table.nextPollAt),
  ]
);

export const rapidFireTopics = pgTable(
  "rapid_fire_topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    topics: jsonb("topics")
      .$type<{ topic: string; context: string }[]>()
      .notNull(),
    ready: boolean("ready").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_rft_user").on(table.userId)]
);
