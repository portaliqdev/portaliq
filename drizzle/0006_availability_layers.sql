CREATE TABLE "status_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_id" text NOT NULL,
	"transfer_entry_id" text,
	"raw_status" text,
	"effective_status" text,
	"source" text NOT NULL,
	"review_state" text,
	"note" text,
	"evidence_url" text,
	"actor_id" text,
	"actor_name" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "status_review_state" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "status_evidence_url" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "raw_portal_status" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "raw_status_updated_at" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "verified_portal_status" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "verified_at" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "verified_note" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "verified_evidence_url" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "override_portal_status" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "override_at" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "override_note" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "override_evidence_url" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "override_actor_id" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "override_actor_name" text;--> statement-breakpoint
CREATE INDEX "status_events_player_idx" ON "status_events" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "status_events_created_idx" ON "status_events" USING btree ("created_at");--> statement-breakpoint
-- Backfill availability layers from the pre-existing flat columns so the
-- effective portal_status is preserved and provenance survives the upgrade.
UPDATE "players" SET
	"raw_portal_status" = COALESCE("raw_portal_status",
		CASE WHEN "status_source" = 'ROSTER_CHECK' THEN 'IN_PORTAL' ELSE "portal_status" END),
	"raw_status_updated_at" = COALESCE("raw_status_updated_at", "availability_checked_at", "updated_at")
WHERE "raw_portal_status" IS NULL;--> statement-breakpoint
UPDATE "players" SET
	"verified_portal_status" = "portal_status",
	"verified_at" = COALESCE("availability_checked_at", "updated_at"),
	"verified_note" = "status_note",
	"status_review_state" = 'VERIFIED'
WHERE "status_source" = 'ROSTER_CHECK';--> statement-breakpoint
UPDATE "players" SET
	"override_portal_status" = "portal_status",
	"override_at" = COALESCE("availability_checked_at", "updated_at"),
	"override_note" = "status_note",
	"status_review_state" = 'VERIFIED'
WHERE "status_source" = 'STAFF_OVERRIDE';--> statement-breakpoint
UPDATE "players" SET "status_review_state" = 'UNVERIFIED'
WHERE "status_review_state" IS NULL AND "portal_status" IS NOT NULL;
