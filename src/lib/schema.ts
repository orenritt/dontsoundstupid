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
  customType,
} from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") {
      return value
        .replace(/^\[/, "")
        .replace(/]$/, "")
        .split(",")
        .map(Number);
    }
    return value as number[];
  },
});

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
  lastDiscoveryAt: timestamp("last_discovery_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export interface DeepDiveData {
  interests: string[];
  focusAreas: string[];
  recentActivity: string[];
  talkingPoints: string[];
  companyContext: string;
  summary: string;
}

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
    researchStatus: text("research_status").notNull().default("none"),
    deepDiveData: jsonb("deep_dive_data").$type<DeepDiveData>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_impress_user").on(table.userId)]
);

export const peerEntityTypeEnum = pgEnum("peer_entity_type", [
  "company",
  "publication",
  "analyst",
  "conference",
  "regulatory-body",
  "research-group",
  "influencer",
  "community",
]);

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
    entityType: peerEntityTypeEnum("entity_type").notNull().default("company"),
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
  "impress-deep-dive",
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

export const knowledgeRelationshipEnum = pgEnum("knowledge_relationship", [
  "works-at",
  "competes-with",
  "uses",
  "researches",
  "part-of",
  "related-to",
  "cares-about",
]);

export const knowledgeEdges = pgTable(
  "knowledge_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceEntityId: uuid("source_entity_id")
      .notNull()
      .references(() => knowledgeEntities.id),
    targetEntityId: uuid("target_entity_id")
      .notNull()
      .references(() => knowledgeEntities.id),
    relationship: knowledgeRelationshipEnum("relationship").notNull(),
  },
  (table) => [
    uniqueIndex("unique_knowledge_edge").on(
      table.sourceEntityId,
      table.targetEntityId,
      table.relationship
    ),
    index("idx_knowledge_edges_source").on(table.sourceEntityId),
    index("idx_knowledge_edges_target").on(table.targetEntityId),
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
          attribution: string | null;
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

// News ingestion (NewsAPI.ai)

export const newsQueryDerivedFromEnum = pgEnum("news_query_derived_from", [
  "impress-list",
  "peer-org",
  "intelligence-goal",
  "industry",
  "ai-refresh",
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

export const syndicationFeeds = pgTable(
  "syndication_feeds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedUrl: text("feed_url").notNull().unique(),
    siteUrl: text("site_url"),
    siteName: text("site_name"),
    feedType: text("feed_type").notNull().default("rss"),
    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    lastItemDate: timestamp("last_item_date", { withTimezone: true }),
    consecutiveErrors: integer("consecutive_errors").notNull().default(0),
    lastErrorMessage: text("last_error_message"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_syndication_feeds_active").on(table.active),
  ]
);

export const userFeedSubscriptions = pgTable(
  "user_feed_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => syndicationFeeds.id),
    derivedFrom: text("derived_from").notNull(),
    profileReference: text("profile_reference").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_user_feed").on(table.userId, table.feedId),
    index("idx_user_feed_user").on(table.userId),
  ]
);

// Newsletter ingestion

export const newsletterIngestionMethodEnum = pgEnum("newsletter_ingestion_method", [
  "rss",
  "system_email",
  "pending",
]);

export const newsletterStatusEnum = pgEnum("newsletter_status", [
  "active",
  "pending_admin_setup",
  "inactive",
]);

export const newsletterRegistry = pgTable(
  "newsletter_registry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    websiteUrl: text("website_url"),
    industryTags: jsonb("industry_tags").$type<string[]>().notNull().default([]),
    ingestionMethod: newsletterIngestionMethodEnum("ingestion_method")
      .notNull()
      .default("pending"),
    feedUrl: text("feed_url"),
    syndicationFeedId: uuid("syndication_feed_id").references(
      () => syndicationFeeds.id
    ),
    systemEmailAddress: text("system_email_address"),
    status: newsletterStatusEnum("status")
      .notNull()
      .default("pending_admin_setup"),
    logoUrl: text("logo_url"),
    lastEmailReceivedAt: timestamp("last_email_received_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_newsletter_status").on(table.status),
    index("idx_newsletter_ingestion").on(table.ingestionMethod),
  ]
);

export const userNewsletterSubscriptions = pgTable(
  "user_newsletter_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    newsletterId: uuid("newsletter_id")
      .notNull()
      .references(() => newsletterRegistry.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_user_newsletter").on(table.userId, table.newsletterId),
    index("idx_user_newsletter_user").on(table.userId),
    index("idx_user_newsletter_newsletter").on(table.newsletterId),
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

// --- Signals ---

export const signalLayerEnum = pgEnum("signal_layer", [
  "syndication",
  "research",
  "narrative",
  "events",
  "personal-graph",
  "ai-research",
  "email-forward",
  "news",
  "newsletter",
]);

export const triggerReasonEnum = pgEnum("trigger_reason", [
  "followed-org",
  "peer-org",
  "impress-list",
  "intelligence-goal",
  "industry-scan",
  "personal-graph",
  "user-curated",
  "newsletter-subscription",
  "ai-discovery",
]);

export const signals = pgTable(
  "signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    layer: signalLayerEnum("layer").notNull(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string>>().notNull().default({}),
    embedding: vector("embedding"),
    embeddingModel: text("embedding_model"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_source_url").on(table.sourceUrl),
    index("idx_signals_layer").on(table.layer),
    index("idx_signals_published_at").on(table.publishedAt),
    index("idx_signals_ingested_at").on(table.ingestedAt),
    index("idx_signals_layer_published").on(table.layer, table.publishedAt),
  ]
);

export const signalProvenance = pgTable(
  "signal_provenance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signalId: uuid("signal_id")
      .notNull()
      .references(() => signals.id),
    userId: uuid("user_id").notNull(),
    triggerReason: triggerReasonEnum("trigger_reason").notNull(),
    profileReference: text("profile_reference").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_provenance").on(
      table.signalId,
      table.userId,
      table.triggerReason,
      table.profileReference
    ),
    index("idx_provenance_signal").on(table.signalId),
    index("idx_provenance_user").on(table.userId),
    index("idx_provenance_user_reason").on(table.userId, table.triggerReason),
  ]
);
