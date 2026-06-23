import { z } from "zod";
import {
  BoardStage,
  EvaluationTier,
  PositionCode,
  WindowType,
} from "./enums";

export { BoardStage };

export const BOARD_STAGE_ORDER: z.infer<typeof BoardStage>[] = [
  "NEEDS_REVIEW", "EVALUATING", "CONTACTED", "MUTUAL_INTEREST",
  "VISIT_SCHEDULED", "OFFER_EXTENDED", "COMMITTED", "LOST",
];

export const BOARD_STAGE_LABEL: Record<z.infer<typeof BoardStage>, string> = {
  NEEDS_REVIEW: "Needs Review",
  EVALUATING: "Evaluating",
  CONTACTED: "Contacted",
  MUTUAL_INTEREST: "Mutual Interest",
  VISIT_SCHEDULED: "Visit Scheduled",
  OFFER_EXTENDED: "Offer Extended",
  COMMITTED: "Committed",
  LOST: "Lost",
};

export const RecruitingStageSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  boardId: z.string(),
  label: z.string(),
  canonicalStage: BoardStage,
  order: z.number(),
  color: z.string().optional(),
  wipLimit: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RecruitingStage = z.infer<typeof RecruitingStageSchema>;

export const BoardSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  seasonYear: z.number(),
  windowType: WindowType.optional(),
  description: z.string().optional(),
  ownerId: z.string(),
  stageIds: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  entryCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Board = z.infer<typeof BoardSchema>;
export type RecruitingBoard = Board;

/** Denormalized card stamp for fast kanban render. */
export const PlayerStampSchema = z.object({
  fullName: z.string(),
  primaryPosition: PositionCode,
  currentSchoolName: z.string(),
  currentSchoolConference: z.string().optional(),
  stars: z.number(),
  yearsRemaining: z.number(),
  fitScore: z.number().optional(),
  heightInches: z.number().optional(),
  weightLbs: z.number().optional(),
});
export type PlayerStamp = z.infer<typeof PlayerStampSchema>;

export const StageEventSchema = z.object({
  stageId: z.string(),
  canonicalStage: BoardStage,
  at: z.string(),
  byUserId: z.string().optional(),
});

export const BoardEntrySchema = z.object({
  id: z.string(),
  orgId: z.string(),
  boardId: z.string(),
  stageId: z.string(),
  canonicalStage: BoardStage,
  playerId: z.string(),
  playerStamp: PlayerStampSchema,
  tier: EvaluationTier.optional(),
  rank: z.number().optional(),
  positionColumn: PositionCode,
  assignedToId: z.string().optional(),
  assignedToName: z.string().optional(),
  flags: z.array(z.string()).default([]),
  notesCount: z.number().optional(),
  stageHistory: z.array(StageEventSchema).default([]),
  stageChangedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BoardEntry = z.infer<typeof BoardEntrySchema>;

/* Watchlist + flattened membership row used by WatchlistRepository */
export const WatchlistSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isShared: z.boolean().default(false),
  playerIds: z.array(z.string()).default([]),
  playerCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Watchlist = z.infer<typeof WatchlistSchema>;

export const WatchlistEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  playerId: z.string(),
  addedAt: z.string(),
});
export type WatchlistEntry = z.infer<typeof WatchlistEntrySchema>;
