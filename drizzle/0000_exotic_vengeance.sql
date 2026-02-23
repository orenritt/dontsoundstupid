CREATE TYPE "public"."briefing_reason" AS ENUM('people-are-talking', 'meeting-prep', 'new-entrant', 'fundraise-or-deal', 'regulatory-or-policy', 'term-emerging', 'network-activity', 'your-space', 'competitive-move', 'event-upcoming', 'other');--> statement-breakpoint
CREATE TYPE "public"."calendar_connection_status" AS ENUM('connected', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."knowledge_entity_type" AS ENUM('company', 'person', 'concept', 'term', 'product', 'event', 'fact');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source" AS ENUM('profile-derived', 'industry-scan', 'briefing-delivered', 'deep-dive', 'feedback-implicit', 'rapid-fire');--> statement-breakpoint
CREATE TYPE "public"."news_query_derived_from" AS ENUM('impress-list', 'peer-org', 'intelligence-goal', 'industry');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "briefings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"items" jsonb NOT NULL,
	"model_used" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" "calendar_connection_status" DEFAULT 'disconnected' NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "feedback_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"briefing_id" uuid NOT NULL,
	"briefing_item_id" text NOT NULL,
	"type" text NOT NULL,
	"topic" text,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impress_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"linkedin_url" text NOT NULL,
	"name" text,
	"title" text,
	"company" text,
	"photo_url" text,
	"source" text DEFAULT 'onboarding' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" "knowledge_entity_type" NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"source" "knowledge_source" NOT NULL,
	"confidence" real NOT NULL,
	"known_since" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reinforced" timestamp with time zone DEFAULT now() NOT NULL,
	"embedding" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"name" text,
	"email" text,
	"linkedin_url" text,
	"title" text,
	"company" text,
	"enriched" boolean DEFAULT false NOT NULL,
	"enrichment_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_intelligence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"attendee_summaries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relevant_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_talking_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_used" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meeting_intelligence_meeting_id_unique" UNIQUE("meeting_id")
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"location" text,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"virtual_url" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_poll_state" (
	"query_id" uuid PRIMARY KEY NOT NULL,
	"last_polled_at" timestamp with time zone,
	"result_count" integer DEFAULT 0 NOT NULL,
	"consecutive_errors" integer DEFAULT 0 NOT NULL,
	"last_error_message" text,
	"next_poll_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query_text" text NOT NULL,
	"derived_from" "news_query_derived_from" NOT NULL,
	"profile_reference" text NOT NULL,
	"content_hash" text NOT NULL,
	"geographic_filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peer_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"description" text,
	"confirmed" boolean,
	"comment" text,
	"source" text DEFAULT 'system-suggested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rapid_fire_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topics" jsonb NOT NULL,
	"ready" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_transcript" text,
	"conversation_input_method" text,
	"parsed_initiatives" jsonb DEFAULT '[]'::jsonb,
	"parsed_concerns" jsonb DEFAULT '[]'::jsonb,
	"parsed_topics" jsonb DEFAULT '[]'::jsonb,
	"parsed_knowledge_gaps" jsonb DEFAULT '[]'::jsonb,
	"parsed_expert_areas" jsonb DEFAULT '[]'::jsonb,
	"parsed_weak_areas" jsonb DEFAULT '[]'::jsonb,
	"rapid_fire_classifications" jsonb DEFAULT '[]'::jsonb,
	"delivery_channel" text,
	"delivery_time" text,
	"delivery_timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"linkedin_url" text,
	"linkedin_photo_url" text,
	"title" text,
	"company" text,
	"onboarding_status" "onboarding_status" DEFAULT 'not_started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_signals" ADD CONSTRAINT "feedback_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_signals" ADD CONSTRAINT "feedback_signals_briefing_id_briefings_id_fk" FOREIGN KEY ("briefing_id") REFERENCES "public"."briefings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impress_contacts" ADD CONSTRAINT "impress_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entities" ADD CONSTRAINT "knowledge_entities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_intelligence" ADD CONSTRAINT "meeting_intelligence_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_poll_state" ADD CONSTRAINT "news_poll_state_query_id_news_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."news_queries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_queries" ADD CONSTRAINT "news_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_organizations" ADD CONSTRAINT "peer_organizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapid_fire_topics" ADD CONSTRAINT "rapid_fire_topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_briefings_user" ON "briefings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_cal_conn_user" ON "calendar_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_user" ON "feedback_signals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_briefing" ON "feedback_signals" USING btree ("briefing_id");--> statement-breakpoint
CREATE INDEX "idx_impress_user" ON "impress_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ke_user" ON "knowledge_entities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ke_user_name_type" ON "knowledge_entities" USING btree ("user_id","name","entity_type");--> statement-breakpoint
CREATE INDEX "idx_attendee_meeting" ON "meeting_attendees" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_meeting_intel_meeting" ON "meeting_intelligence" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_meetings_user" ON "meetings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_meetings_start" ON "meetings" USING btree ("user_id","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_meetings_external" ON "meetings" USING btree ("user_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_news_poll_next" ON "news_poll_state" USING btree ("next_poll_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_news_query" ON "news_queries" USING btree ("user_id","content_hash");--> statement-breakpoint
CREATE INDEX "idx_news_queries_user" ON "news_queries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_news_queries_active" ON "news_queries" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "idx_news_queries_hash" ON "news_queries" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_peer_org_user" ON "peer_organizations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_rft_user" ON "rapid_fire_topics" USING btree ("user_id");