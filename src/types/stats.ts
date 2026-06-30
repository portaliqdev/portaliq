import { z } from "zod";
import { PositionCode, WindowType, PortalStatus, EnrollmentTiming } from "./enums";

/** Per-season production. Universal columns + position-specific metric bag. */
export const PlayerStatsSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerId: z.string(),
  seasonYear: z.number(),
  schoolId: z.string(),
  schoolName: z.string().optional(),
  position: PositionCode,
  gamesPlayed: z.number(),
  gamesStarted: z.number().optional(),
  snaps: z.number().optional(),
  pffOverall: z.number().optional(),
  metrics: z.record(z.string(), z.number()).default({}),
  source: z.string(),
  verified: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;

/** Athletic testing / measurables from a dated source. */
export const PlayerMeasurementsSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerId: z.string(),
  measuredAt: z.string(),
  source: z.string(),
  heightInches: z.number().optional(),
  weightLbs: z.number().optional(),
  wingspanInches: z.number().optional(),
  armLengthInches: z.number().optional(),
  handSizeInches: z.number().optional(),
  fortyYard: z.number().optional(),
  tenYardSplit: z.number().optional(),
  verticalInches: z.number().optional(),
  broadJumpInches: z.number().optional(),
  threeCone: z.number().optional(),
  shuttle: z.number().optional(),
  benchReps: z.number().optional(),
  verified: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlayerMeasurements = z.infer<typeof PlayerMeasurementsSchema>;

/** Pointer to evaluation film. */
export const FilmType = z.enum(["CUT_UP", "ALL_22", "HIGHLIGHT", "GAME", "TV_COPY"]);
export const FilmLinkSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerId: z.string(),
  url: z.string(),
  type: FilmType,
  title: z.string(),
  seasonYear: z.number().optional(),
  opponent: z.string().optional(),
  durationSec: z.number().optional(),
  addedById: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FilmLink = z.infer<typeof FilmLinkSchema>;

/** One entry in a transfer record's chronological status history. */
export const TransferStatusEventSchema = z.object({
  status: PortalStatus,
  at: z.string(),
  source: z.string().optional(),
  byUserId: z.string().optional(),
});
export type TransferStatusEvent = z.infer<typeof TransferStatusEventSchema>;

export const TransferEntrySchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerId: z.string(),
  fromSchoolId: z.string(),
  fromSchoolName: z.string().optional(),
  status: PortalStatus,
  windowType: WindowType,
  seasonYear: z.number(),
  enteredAt: z.string(),
  committedToSchoolId: z.string().optional(),
  committedToSchoolName: z.string().optional(),
  committedAt: z.string().optional(),
  withdrawnAt: z.string().optional(),
  enrolledAt: z.string().optional(),
  enrollmentTiming: EnrollmentTiming.optional(),
  isGradTransfer: z.boolean().default(false),
  outgoing: z.boolean().default(false),
  statusHistory: z.array(TransferStatusEventSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TransferEntry = z.infer<typeof TransferEntrySchema>;
