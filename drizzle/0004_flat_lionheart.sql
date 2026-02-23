ALTER TYPE "public"."knowledge_source" ADD VALUE 'calendar-deep-dive';--> statement-breakpoint
CREATE TABLE "inbound_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"channel_type" text NOT NULL,
	"message_text" text NOT NULL,
	"classified_intent" text,
	"resolved_item_number" integer,
	"confidence" real,
	"response_text" text,
	"processed_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "narrative_analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_area" text NOT NULL,
	"signal_count" integer DEFAULT 0 NOT NULL,
	"frames_detected" integer DEFAULT 0 NOT NULL,
	"term_bursts_detected" integer DEFAULT 0 NOT NULL,
	"model_used" text,
	"analyzed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "narrative_frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_area" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"momentum_score" real DEFAULT 0 NOT NULL,
	"adoption_count" integer DEFAULT 1 NOT NULL,
	"related_signal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"briefing_id" uuid NOT NULL,
	"channel_type" text DEFAULT 'email' NOT NULL,
	"briefing_items" jsonb NOT NULL,
	"conversation_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "term_bursts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_area" text NOT NULL,
	"term" text NOT NULL,
	"frequency_delta" real DEFAULT 0 NOT NULL,
	"adoption_velocity" real DEFAULT 0 NOT NULL,
	"source_count" integer DEFAULT 1 NOT NULL,
	"context_examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"first_appearance" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inbound_replies" ADD CONSTRAINT "inbound_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_replies" ADD CONSTRAINT "inbound_replies_session_id_reply_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."reply_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_sessions" ADD CONSTRAINT "reply_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_sessions" ADD CONSTRAINT "reply_sessions_briefing_id_briefings_id_fk" FOREIGN KEY ("briefing_id") REFERENCES "public"."briefings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inbound_reply_user" ON "inbound_replies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_inbound_reply_session" ON "inbound_replies" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_narr_analysis_topic" ON "narrative_analysis_runs" USING btree ("topic_area");--> statement-breakpoint
CREATE INDEX "idx_narrative_frame_topic" ON "narrative_frames" USING btree ("topic_area");--> statement-breakpoint
CREATE INDEX "idx_narrative_frame_momentum" ON "narrative_frames" USING btree ("momentum_score");--> statement-breakpoint
CREATE INDEX "idx_reply_session_user" ON "reply_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reply_session_briefing" ON "reply_sessions" USING btree ("briefing_id");--> statement-breakpoint
CREATE INDEX "idx_reply_session_active" ON "reply_sessions" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "idx_term_burst_topic" ON "term_bursts" USING btree ("topic_area");--> statement-breakpoint
CREATE INDEX "idx_term_burst_velocity" ON "term_bursts" USING btree ("adoption_velocity");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_term_burst_unique" ON "term_bursts" USING btree ("topic_area","term");