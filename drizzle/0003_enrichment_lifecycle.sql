ALTER TYPE "public"."knowledge_source" ADD VALUE 'calendar-deep-dive';--> statement-breakpoint
ALTER TABLE "impress_contacts" ADD COLUMN "last_enriched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "impress_contacts" ADD COLUMN "enrichment_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "impress_contacts" ADD COLUMN "enrichment_depth" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "re_enrichment_interval_days" integer DEFAULT 90 NOT NULL;