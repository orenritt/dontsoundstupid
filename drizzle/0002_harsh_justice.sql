CREATE TYPE "public"."knowledge_relationship" AS ENUM('works-at', 'competes-with', 'uses', 'researches', 'part-of', 'related-to', 'cares-about');--> statement-breakpoint
CREATE TYPE "public"."newsletter_ingestion_method" AS ENUM('rss', 'system_email', 'pending');--> statement-breakpoint
CREATE TYPE "public"."newsletter_status" AS ENUM('active', 'pending_admin_setup', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."peer_entity_type" AS ENUM('company', 'publication', 'analyst', 'conference', 'regulatory-body', 'research-group', 'influencer', 'community');--> statement-breakpoint
CREATE TYPE "public"."signal_layer" AS ENUM('syndication', 'research', 'narrative', 'events', 'personal-graph', 'ai-research', 'email-forward', 'news', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."trigger_reason" AS ENUM('followed-org', 'peer-org', 'impress-list', 'intelligence-goal', 'industry-scan', 'personal-graph', 'user-curated', 'newsletter-subscription', 'ai-discovery');--> statement-breakpoint
ALTER TYPE "public"."knowledge_source" ADD VALUE 'impress-deep-dive';--> statement-breakpoint
ALTER TYPE "public"."news_query_derived_from" ADD VALUE 'ai-refresh';--> statement-breakpoint
CREATE TABLE "knowledge_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_entity_id" uuid NOT NULL,
	"target_entity_id" uuid NOT NULL,
	"relationship" "knowledge_relationship" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"website_url" text,
	"industry_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ingestion_method" "newsletter_ingestion_method" DEFAULT 'pending' NOT NULL,
	"feed_url" text,
	"syndication_feed_id" uuid,
	"system_email_address" text,
	"status" "newsletter_status" DEFAULT 'pending_admin_setup' NOT NULL,
	"logo_url" text,
	"last_email_received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signal_provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"trigger_reason" "trigger_reason" NOT NULL,
	"profile_reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layer" "signal_layer" NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"embedding_model" text,
	"published_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_newsletter_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "impress_contacts" ADD COLUMN "research_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "impress_contacts" ADD COLUMN "deep_dive_data" jsonb;--> statement-breakpoint
ALTER TABLE "peer_organizations" ADD COLUMN "entity_type" "peer_entity_type" DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "last_discovery_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_source_entity_id_knowledge_entities_id_fk" FOREIGN KEY ("source_entity_id") REFERENCES "public"."knowledge_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_target_entity_id_knowledge_entities_id_fk" FOREIGN KEY ("target_entity_id") REFERENCES "public"."knowledge_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_registry" ADD CONSTRAINT "newsletter_registry_syndication_feed_id_syndication_feeds_id_fk" FOREIGN KEY ("syndication_feed_id") REFERENCES "public"."syndication_feeds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_provenance" ADD CONSTRAINT "signal_provenance_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_newsletter_subscriptions" ADD CONSTRAINT "user_newsletter_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_newsletter_subscriptions" ADD CONSTRAINT "user_newsletter_subscriptions_newsletter_id_newsletter_registry_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletter_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_knowledge_edge" ON "knowledge_edges" USING btree ("source_entity_id","target_entity_id","relationship");--> statement-breakpoint
CREATE INDEX "idx_knowledge_edges_source" ON "knowledge_edges" USING btree ("source_entity_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_edges_target" ON "knowledge_edges" USING btree ("target_entity_id");--> statement-breakpoint
CREATE INDEX "idx_newsletter_status" ON "newsletter_registry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_newsletter_ingestion" ON "newsletter_registry" USING btree ("ingestion_method");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_provenance" ON "signal_provenance" USING btree ("signal_id","user_id","trigger_reason","profile_reference");--> statement-breakpoint
CREATE INDEX "idx_provenance_signal" ON "signal_provenance" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "idx_provenance_user" ON "signal_provenance" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_provenance_user_reason" ON "signal_provenance" USING btree ("user_id","trigger_reason");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_source_url" ON "signals" USING btree ("source_url");--> statement-breakpoint
CREATE INDEX "idx_signals_layer" ON "signals" USING btree ("layer");--> statement-breakpoint
CREATE INDEX "idx_signals_published_at" ON "signals" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_signals_ingested_at" ON "signals" USING btree ("ingested_at");--> statement-breakpoint
CREATE INDEX "idx_signals_layer_published" ON "signals" USING btree ("layer","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_newsletter" ON "user_newsletter_subscriptions" USING btree ("user_id","newsletter_id");--> statement-breakpoint
CREATE INDEX "idx_user_newsletter_user" ON "user_newsletter_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_newsletter_newsletter" ON "user_newsletter_subscriptions" USING btree ("newsletter_id");