// Better Auth tables (user/session/account/verification) — re-exported so
// drizzle-kit includes them in migrations.
export * from "./auth-schema";

/**
 * Drizzle table definitions — Postgres mirror of the Zod domain types in
 * src/types/*. Source of truth for shapes stays in src/types; this file is the
 * persisted projection of the CFBD-ingestion + AI-evaluation data path.
 *
 * Conventions:
 *  - Text PKs (stable external ids, e.g. CFBD player id) — matches the string
 *    ids the Repositories interface returns.
 *  - ISO date strings stored as text to match the app contract (Player.createdAt
 *    is z.string()), so the Postgres adapter needs no date marshalling.
 *  - Nested objects / arrays / metric bags → jsonb with a $type<> for safety.
 */
import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import type { SchoolStamp } from "@/types/school";
import type { EligibilityBlock } from "@/types/player";
import type { SourceRef } from "@/types/ai";

/* ── schools ─────────────────────────────────────────────────────────────── */
export const schools = pgTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mascot: text("mascot"),
  conference: text("conference").notNull(),
  division: text("division").notNull(),
  state: text("state").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  isPower: boolean("is_power").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── players ─────────────────────────────────────────────────────────────── */
export const players = pgTable(
  "players",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    fullName: text("full_name").notNull(),
    currentSchoolId: text("current_school_id").notNull(),
    currentSchool: jsonb("current_school").$type<SchoolStamp>().notNull(),
    previousSchoolIds: jsonb("previous_school_ids").$type<string[]>().notNull().default([]),
    primaryPosition: text("primary_position").notNull(),
    secondaryPositions: jsonb("secondary_positions").$type<string[]>().notNull().default([]),
    positionGroup: text("position_group").notNull(),
    jerseyNumber: integer("jersey_number"),
    heightInches: integer("height_inches").notNull(),
    weightLbs: integer("weight_lbs").notNull(),
    handedness: text("handedness"),
    hometown: text("hometown"),
    homeState: text("home_state"),
    stars: integer("stars").notNull().default(0),
    compositeRating: doublePrecision("composite_rating").notNull().default(0),
    nationalRank: integer("national_rank"),
    positionRank: integer("position_rank"),
    eligibilityClass: text("eligibility_class").notNull(),
    eligibility: jsonb("eligibility").$type<EligibilityBlock>().notNull(),
    scholarshipStatus: text("scholarship_status").notNull(),
    portalStatus: text("portal_status"),
    // Availability provenance — who/what last set portalStatus, and when.
    // Precedence: STAFF_OVERRIDE > ROSTER_CHECK > CFBD (enforced on write).
    statusSource: text("status_source").notNull().default("CFBD"),
    availabilityCheckedAt: text("availability_checked_at"),
    statusNote: text("status_note"),
    // computed / cached
    fitScore: doublePrecision("fit_score"),
    needScore: doublePrecision("need_score"),
    productionScore: doublePrecision("production_score"),
    undervaluation: doublePrecision("undervaluation"),
    recruitingStatus: text("recruiting_status"),
    consensusTier: text("consensus_tier"),
    consensusGrade: doublePrecision("consensus_grade"),
    awards: jsonb("awards").$type<string[]>().notNull().default([]),
    injuryFlags: jsonb("injury_flags").$type<string[]>().notNull().default([]),
    characterFlags: jsonb("character_flags").$type<string[]>().notNull().default([]),
    nilEstimate: doublePrecision("nil_estimate"),
    aiInsightId: text("ai_insight_id"),
    watchlistIds: jsonb("watchlist_ids").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    computedAt: text("computed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    orgIdx: index("players_org_idx").on(t.orgId),
    posIdx: index("players_position_idx").on(t.primaryPosition),
    portalIdx: index("players_portal_idx").on(t.portalStatus),
    schoolIdx: index("players_school_idx").on(t.currentSchoolId),
  }),
);

/* ── player_stats (owned subresource) ────────────────────────────────────── */
export const playerStats = pgTable(
  "player_stats",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    playerId: text("player_id").notNull(),
    seasonYear: integer("season_year").notNull(),
    schoolId: text("school_id").notNull(),
    schoolName: text("school_name"),
    position: text("position").notNull(),
    gamesPlayed: integer("games_played").notNull(),
    gamesStarted: integer("games_started"),
    snaps: integer("snaps"),
    pffOverall: doublePrecision("pff_overall"),
    metrics: jsonb("metrics").$type<Record<string, number>>().notNull().default({}),
    source: text("source").notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    playerIdx: index("player_stats_player_idx").on(t.playerId),
  }),
);

/* ── player_measurements (owned subresource) ─────────────────────────────── */
export const playerMeasurements = pgTable(
  "player_measurements",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    playerId: text("player_id").notNull(),
    measuredAt: text("measured_at").notNull(),
    source: text("source").notNull(),
    heightInches: doublePrecision("height_inches"),
    weightLbs: doublePrecision("weight_lbs"),
    wingspanInches: doublePrecision("wingspan_inches"),
    armLengthInches: doublePrecision("arm_length_inches"),
    handSizeInches: doublePrecision("hand_size_inches"),
    fortyYard: doublePrecision("forty_yard"),
    tenYardSplit: doublePrecision("ten_yard_split"),
    verticalInches: doublePrecision("vertical_inches"),
    broadJumpInches: doublePrecision("broad_jump_inches"),
    threeCone: doublePrecision("three_cone"),
    shuttle: doublePrecision("shuttle"),
    benchReps: integer("bench_reps"),
    verified: boolean("verified").notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    playerIdx: index("player_measurements_player_idx").on(t.playerId),
  }),
);

/* ── film_links (owned subresource) ──────────────────────────────────────── */
export const filmLinks = pgTable(
  "film_links",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    playerId: text("player_id").notNull(),
    url: text("url").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    seasonYear: integer("season_year"),
    opponent: text("opponent"),
    durationSec: integer("duration_sec"),
    addedById: text("added_by_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    playerIdx: index("film_links_player_idx").on(t.playerId),
  }),
);

/* ── transfer_entries (owned subresource — the portal state machine) ─────── */
export const transferEntries = pgTable(
  "transfer_entries",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    playerId: text("player_id").notNull(),
    fromSchoolId: text("from_school_id").notNull(),
    fromSchoolName: text("from_school_name"),
    status: text("status").notNull(),
    windowType: text("window_type").notNull(),
    seasonYear: integer("season_year").notNull(),
    enteredAt: text("entered_at").notNull(),
    committedToSchoolId: text("committed_to_school_id"),
    committedToSchoolName: text("committed_to_school_name"),
    committedAt: text("committed_at"),
    withdrawnAt: text("withdrawn_at"),
    enrolledAt: text("enrolled_at"),
    enrollmentTiming: text("enrollment_timing"),
    isGradTransfer: boolean("is_grad_transfer").notNull().default(false),
    outgoing: boolean("outgoing").notNull().default(false),
    statusHistory: jsonb("status_history")
      .$type<{ status: string; at: string; byUserId?: string }[]>()
      .notNull()
      .default([]),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    playerIdx: index("transfer_entries_player_idx").on(t.playerId),
    seasonIdx: index("transfer_entries_season_idx").on(t.seasonYear),
  }),
);

/* ── evaluations (human grades) ──────────────────────────────────────────── */
export const evaluations = pgTable(
  "evaluations",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    playerId: text("player_id").notNull(),
    evaluatorId: text("evaluator_id").notNull(),
    evaluatorName: text("evaluator_name"),
    evaluatorRole: text("evaluator_role").notNull(),
    stage: text("stage").notNull(),
    gradeScale: text("grade_scale").notNull(),
    tier: text("tier"),
    numericGrade: doublePrecision("numeric_grade"),
    schemeFitScore: doublePrecision("scheme_fit_score"),
    filmReviewed: boolean("film_reviewed").notNull().default(false),
    notes: text("notes"),
    facetGrades: jsonb("facet_grades").$type<Record<string, number>>(),
    confidence: text("confidence"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    playerIdx: index("evaluations_player_idx").on(t.playerId),
    evaluatorIdx: index("evaluations_evaluator_idx").on(t.evaluatorId),
  }),
);

/* ── ai_insights (AI-generated evaluations — the Gemini output target) ────── */
export const aiInsights = pgTable(
  "ai_insights",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    playerId: text("player_id").notNull(),
    type: text("type").notNull(),
    model: text("model").notNull(),
    headline: text("headline").notNull(),
    summary: text("summary").notNull(),
    body: text("body"),
    fitScore: doublePrecision("fit_score"),
    confidence: text("confidence").notNull(),
    strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
    concerns: jsonb("concerns").$type<string[]>().notNull().default([]),
    comparablePlayers: jsonb("comparable_players").$type<string[]>().notNull().default([]),
    sourceRefs: jsonb("source_refs").$type<SourceRef[]>().notNull().default([]),
    generatedAt: text("generated_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    playerIdx: index("ai_insights_player_idx").on(t.playerId),
    kindIdx: index("ai_insights_kind_idx").on(t.type),
  }),
);

/* ── roster_slots (org's own roster — a depth-chart line) ─────────────────── */
export const rosterSlots = pgTable(
  "roster_slots",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    playerName: text("player_name").notNull(),
    linkedPlayerId: text("linked_player_id"),
    position: text("position").notNull(),
    positionGroup: text("position_group").notNull(),
    depthRank: integer("depth_rank").notNull(),
    eligibilityClass: text("eligibility_class").notNull(),
    yearsRemaining: integer("years_remaining").notNull(),
    scholarshipStatus: text("scholarship_status").notNull(),
    departureRisk: text("departure_risk").notNull(),
    starter: boolean("starter").notNull().default(false),
    projectedGrade: doublePrecision("projected_grade"),
  },
  (t) => ({
    orgIdx: index("roster_slots_org_idx").on(t.orgId),
    posIdx: index("roster_slots_position_idx").on(t.position),
  }),
);

/* ── roster_snapshots (org roster meta; slots live in roster_slots) ───────── */
export const rosterSnapshots = pgTable("roster_snapshots", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  seasonYear: integer("season_year").notNull(),
  asOf: text("as_of").notNull(),
  label: text("label"),
  scholarshipCount: integer("scholarship_count").notNull(),
  rosterCount: integer("roster_count").notNull(),
  scholarshipLimit: integer("scholarship_limit").notNull(),
  rosterLimit: integer("roster_limit").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── team_needs (per-position need analysis — AI-scored) ──────────────────── */
export const teamNeeds = pgTable(
  "team_needs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    seasonYear: integer("season_year").notNull(),
    position: text("position").notNull(),
    positionGroup: text("position_group").notNull(),
    idealDepth: integer("ideal_depth").notNull(),
    currentDepth: integer("current_depth").notNull(),
    projectedDepartures: integer("projected_departures").notNull(),
    incomingCommits: integer("incoming_commits").notNull().default(0),
    projectedReturning: integer("projected_returning").notNull(),
    needScore: doublePrecision("need_score").notNull(),
    qualityGap: doublePrecision("quality_gap"),
    priority: text("priority").notNull(),
    availableScholarships: integer("available_scholarships"),
    starterReturning: boolean("starter_returning"),
    notes: text("notes"),
    computedAt: text("computed_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    orgIdx: index("team_needs_org_idx").on(t.orgId),
  }),
);

/* ── recruiting board (boards / stages / entries) + watchlists ───────────── */
import type { PlayerStamp } from "@/types/board";

export const boards = pgTable("boards", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  seasonYear: integer("season_year").notNull(),
  windowType: text("window_type"),
  description: text("description"),
  ownerId: text("owner_id").notNull(),
  stageIds: jsonb("stage_ids").$type<string[]>().notNull().default([]),
  isDefault: boolean("is_default").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  entryCount: integer("entry_count"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const recruitingStages = pgTable("recruiting_stages", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  boardId: text("board_id").notNull(),
  label: text("label").notNull(),
  canonicalStage: text("canonical_stage").notNull(),
  order: integer("stage_order").notNull(),
  color: text("color"),
  wipLimit: integer("wip_limit"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const boardEntries = pgTable(
  "board_entries",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    boardId: text("board_id").notNull(),
    stageId: text("stage_id").notNull(),
    canonicalStage: text("canonical_stage").notNull(),
    playerId: text("player_id").notNull(),
    playerStamp: jsonb("player_stamp").$type<PlayerStamp>().notNull(),
    tier: text("tier"),
    rank: integer("rank"),
    positionColumn: text("position_column").notNull(),
    assignedToId: text("assigned_to_id"),
    assignedToName: text("assigned_to_name"),
    flags: jsonb("flags").$type<string[]>().notNull().default([]),
    notesCount: integer("notes_count"),
    stageHistory: jsonb("stage_history")
      .$type<{ stageId: string; canonicalStage: string; at: string; byUserId?: string }[]>()
      .notNull()
      .default([]),
    stageChangedAt: text("stage_changed_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({ boardIdx: index("board_entries_board_idx").on(t.boardId) }),
);

export const watchlists = pgTable("watchlists", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isShared: boolean("is_shared").notNull().default(false),
  playerIds: jsonb("player_ids").$type<string[]>().notNull().default([]),
  playerCount: integer("player_count"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── recruiting_workflows (per-player recruiting lifecycle + activity log) ── */
import type { StaffOwner, RecruitingActivity } from "@/types/recruiting-workflow";

export const recruitingWorkflows = pgTable(
  "recruiting_workflows",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    playerId: text("player_id").notNull(),
    playerName: text("player_name").notNull(),
    position: text("position").notNull(),
    currentSchoolName: text("current_school_name").notNull(),
    status: text("status").notNull(),
    priority: text("priority").notNull(),
    offerStatus: text("offer_status").notNull(),
    visitStatus: text("visit_status").notNull(),
    riskLevel: text("risk_level").notNull(),
    priorityScore: doublePrecision("priority_score").notNull().default(0),
    owner: jsonb("owner").$type<StaffOwner>(),
    nextAction: text("next_action"),
    nextActionAt: text("next_action_at"),
    lastContactAt: text("last_contact_at"),
    visitAt: text("visit_at"),
    offerExtendedAt: text("offer_extended_at"),
    committedAt: text("committed_at"),
    signedAt: text("signed_at"),
    enrolledAt: text("enrolled_at"),
    activities: jsonb("activities").$type<RecruitingActivity[]>().notNull().default([]),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    orgIdx: index("recruiting_workflows_org_idx").on(t.orgId),
    playerIdx: index("recruiting_workflows_player_idx").on(t.playerId),
    statusIdx: index("recruiting_workflows_status_idx").on(t.status),
  }),
);

export const schema = {
  schools,
  players,
  playerStats,
  playerMeasurements,
  filmLinks,
  transferEntries,
  evaluations,
  aiInsights,
  rosterSlots,
  rosterSnapshots,
  teamNeeds,
  boards,
  recruitingStages,
  boardEntries,
  watchlists,
  recruitingWorkflows,
};
