CREATE TABLE "ai_insights" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_id" text NOT NULL,
	"type" text NOT NULL,
	"model" text NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"body" text,
	"fit_score" double precision,
	"confidence" text NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"concerns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"comparable_players" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_id" text NOT NULL,
	"evaluator_id" text NOT NULL,
	"evaluator_name" text,
	"evaluator_role" text NOT NULL,
	"stage" text NOT NULL,
	"grade_scale" text NOT NULL,
	"tier" text,
	"numeric_grade" double precision,
	"scheme_fit_score" double precision,
	"film_reviewed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"facet_grades" jsonb,
	"confidence" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_links" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_id" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"season_year" integer,
	"opponent" text,
	"duration_sec" integer,
	"added_by_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_measurements" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_id" text NOT NULL,
	"measured_at" text NOT NULL,
	"source" text NOT NULL,
	"height_inches" double precision,
	"weight_lbs" double precision,
	"wingspan_inches" double precision,
	"arm_length_inches" double precision,
	"hand_size_inches" double precision,
	"forty_yard" double precision,
	"ten_yard_split" double precision,
	"vertical_inches" double precision,
	"broad_jump_inches" double precision,
	"three_cone" double precision,
	"shuttle" double precision,
	"bench_reps" integer,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_id" text NOT NULL,
	"season_year" integer NOT NULL,
	"school_id" text NOT NULL,
	"school_name" text,
	"position" text NOT NULL,
	"games_played" integer NOT NULL,
	"games_started" integer,
	"snaps" integer,
	"pff_overall" double precision,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"full_name" text NOT NULL,
	"current_school_id" text NOT NULL,
	"current_school" jsonb NOT NULL,
	"previous_school_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"primary_position" text NOT NULL,
	"secondary_positions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position_group" text NOT NULL,
	"jersey_number" integer,
	"height_inches" integer NOT NULL,
	"weight_lbs" integer NOT NULL,
	"handedness" text,
	"hometown" text,
	"home_state" text,
	"stars" integer DEFAULT 0 NOT NULL,
	"composite_rating" double precision DEFAULT 0 NOT NULL,
	"national_rank" integer,
	"position_rank" integer,
	"eligibility_class" text NOT NULL,
	"eligibility" jsonb NOT NULL,
	"scholarship_status" text NOT NULL,
	"portal_status" text,
	"fit_score" double precision,
	"need_score" double precision,
	"production_score" double precision,
	"undervaluation" double precision,
	"recruiting_status" text,
	"consensus_tier" text,
	"consensus_grade" double precision,
	"awards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"injury_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"character_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nil_estimate" double precision,
	"ai_insight_id" text,
	"watchlist_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mascot" text,
	"conference" text NOT NULL,
	"division" text NOT NULL,
	"state" text NOT NULL,
	"logo_url" text,
	"primary_color" text,
	"is_power" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_id" text NOT NULL,
	"from_school_id" text NOT NULL,
	"from_school_name" text,
	"status" text NOT NULL,
	"window_type" text NOT NULL,
	"season_year" integer NOT NULL,
	"entered_at" text NOT NULL,
	"committed_to_school_id" text,
	"committed_to_school_name" text,
	"committed_at" text,
	"withdrawn_at" text,
	"enrolled_at" text,
	"enrollment_timing" text,
	"is_grad_transfer" boolean DEFAULT false NOT NULL,
	"outgoing" boolean DEFAULT false NOT NULL,
	"status_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_insights_player_idx" ON "ai_insights" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "ai_insights_kind_idx" ON "ai_insights" USING btree ("type");--> statement-breakpoint
CREATE INDEX "evaluations_player_idx" ON "evaluations" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "evaluations_evaluator_idx" ON "evaluations" USING btree ("evaluator_id");--> statement-breakpoint
CREATE INDEX "film_links_player_idx" ON "film_links" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "player_measurements_player_idx" ON "player_measurements" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "player_stats_player_idx" ON "player_stats" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "players_org_idx" ON "players" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "players_position_idx" ON "players" USING btree ("primary_position");--> statement-breakpoint
CREATE INDEX "players_portal_idx" ON "players" USING btree ("portal_status");--> statement-breakpoint
CREATE INDEX "players_school_idx" ON "players" USING btree ("current_school_id");--> statement-breakpoint
CREATE INDEX "transfer_entries_player_idx" ON "transfer_entries" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "transfer_entries_season_idx" ON "transfer_entries" USING btree ("season_year");