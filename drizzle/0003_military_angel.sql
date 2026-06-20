ALTER TABLE "players" ADD COLUMN "status_source" text DEFAULT 'CFBD' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "availability_checked_at" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "status_note" text;