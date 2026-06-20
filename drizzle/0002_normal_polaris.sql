CREATE TABLE "board_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"board_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"canonical_stage" text NOT NULL,
	"player_id" text NOT NULL,
	"player_stamp" jsonb NOT NULL,
	"tier" text,
	"rank" integer,
	"position_column" text NOT NULL,
	"assigned_to_id" text,
	"assigned_to_name" text,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes_count" integer,
	"stage_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stage_changed_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"season_year" integer NOT NULL,
	"window_type" text,
	"description" text,
	"owner_id" text NOT NULL,
	"stage_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"entry_count" integer,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruiting_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"board_id" text NOT NULL,
	"label" text NOT NULL,
	"canonical_stage" text NOT NULL,
	"stage_order" integer NOT NULL,
	"color" text,
	"wip_limit" integer,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_shared" boolean DEFAULT false NOT NULL,
	"player_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"player_count" integer,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "board_entries_board_idx" ON "board_entries" USING btree ("board_id");