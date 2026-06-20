CREATE TABLE "recruiting_workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_id" text NOT NULL,
	"player_name" text NOT NULL,
	"position" text NOT NULL,
	"current_school_name" text NOT NULL,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"offer_status" text NOT NULL,
	"visit_status" text NOT NULL,
	"risk_level" text NOT NULL,
	"priority_score" double precision DEFAULT 0 NOT NULL,
	"owner" jsonb,
	"next_action" text,
	"next_action_at" text,
	"last_contact_at" text,
	"visit_at" text,
	"offer_extended_at" text,
	"committed_at" text,
	"signed_at" text,
	"enrolled_at" text,
	"activities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "recruiting_workflows_org_idx" ON "recruiting_workflows" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "recruiting_workflows_player_idx" ON "recruiting_workflows" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "recruiting_workflows_status_idx" ON "recruiting_workflows" USING btree ("status");