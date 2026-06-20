CREATE TABLE "roster_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_name" text NOT NULL,
	"linked_player_id" text,
	"position" text NOT NULL,
	"position_group" text NOT NULL,
	"depth_rank" integer NOT NULL,
	"eligibility_class" text NOT NULL,
	"years_remaining" integer NOT NULL,
	"scholarship_status" text NOT NULL,
	"departure_risk" text NOT NULL,
	"starter" boolean DEFAULT false NOT NULL,
	"projected_grade" double precision
);
--> statement-breakpoint
CREATE TABLE "roster_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"season_year" integer NOT NULL,
	"as_of" text NOT NULL,
	"label" text,
	"scholarship_count" integer NOT NULL,
	"roster_count" integer NOT NULL,
	"scholarship_limit" integer NOT NULL,
	"roster_limit" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_needs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"season_year" integer NOT NULL,
	"position" text NOT NULL,
	"position_group" text NOT NULL,
	"ideal_depth" integer NOT NULL,
	"current_depth" integer NOT NULL,
	"projected_departures" integer NOT NULL,
	"incoming_commits" integer DEFAULT 0 NOT NULL,
	"projected_returning" integer NOT NULL,
	"need_score" double precision NOT NULL,
	"quality_gap" double precision,
	"priority" text NOT NULL,
	"available_scholarships" integer,
	"starter_returning" boolean,
	"notes" text,
	"computed_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "roster_slots_org_idx" ON "roster_slots" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "roster_slots_position_idx" ON "roster_slots" USING btree ("position");--> statement-breakpoint
CREATE INDEX "team_needs_org_idx" ON "team_needs" USING btree ("org_id");