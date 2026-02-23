CREATE TABLE "syndication_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_url" text NOT NULL,
	"site_url" text,
	"site_name" text,
	"feed_type" text DEFAULT 'rss' NOT NULL,
	"last_polled_at" timestamp with time zone,
	"last_item_date" timestamp with time zone,
	"consecutive_errors" integer DEFAULT 0 NOT NULL,
	"last_error_message" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "syndication_feeds_feed_url_unique" UNIQUE("feed_url")
);
--> statement-breakpoint
CREATE TABLE "user_feed_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feed_id" uuid NOT NULL,
	"derived_from" text NOT NULL,
	"profile_reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_feed_subscriptions" ADD CONSTRAINT "user_feed_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feed_subscriptions" ADD CONSTRAINT "user_feed_subscriptions_feed_id_syndication_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."syndication_feeds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_syndication_feeds_active" ON "syndication_feeds" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_feed" ON "user_feed_subscriptions" USING btree ("user_id","feed_id");--> statement-breakpoint
CREATE INDEX "idx_user_feed_user" ON "user_feed_subscriptions" USING btree ("user_id");