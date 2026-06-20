import { z } from "zod";
import {
  PositionCode,
  PositionGroup,
  EligibilityClass,
  ScholarshipStatus,
  DepartureRisk,
  NeedPriority,
} from "./enums";

export const RosterSlotSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerName: z.string(),
  linkedPlayerId: z.string().optional(),
  position: PositionCode,
  positionGroup: PositionGroup,
  depthRank: z.number(),
  eligibilityClass: EligibilityClass,
  yearsRemaining: z.number(),
  scholarshipStatus: ScholarshipStatus,
  departureRisk: DepartureRisk,
  starter: z.boolean().default(false),
  projectedGrade: z.number().optional(),
});
export type RosterSlot = z.infer<typeof RosterSlotSchema>;

export const RosterSnapshotSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  seasonYear: z.number(),
  asOf: z.string(),
  label: z.string().optional(),
  slots: z.array(RosterSlotSchema).default([]),
  scholarshipCount: z.number(),
  rosterCount: z.number(),
  scholarshipLimit: z.number(),
  rosterLimit: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RosterSnapshot = z.infer<typeof RosterSnapshotSchema>;

/** The TeamNeeds entity — per-position need analysis. Exported as PositionNeed. */
export const PositionNeedSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  seasonYear: z.number(),
  position: PositionCode,
  positionGroup: PositionGroup,
  idealDepth: z.number(),
  currentDepth: z.number(),
  projectedDepartures: z.number(),
  incomingCommits: z.number(),
  projectedReturning: z.number(),
  needScore: z.number().min(0).max(100),
  qualityGap: z.number().optional(),
  priority: NeedPriority,
  availableScholarships: z.number().optional(),
  starterReturning: z.boolean().optional(),
  notes: z.string().optional(),
  computedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PositionNeed = z.infer<typeof PositionNeedSchema>;
export type TeamNeeds = PositionNeed;

/** Computed view: roster grouped by position lane. */
export interface DepthChartPosition {
  position: PositionCode;
  group: PositionGroup;
  idealDepth: number;
  slots: RosterSlot[];
}
export interface DepthChart {
  orgId: string;
  seasonYear: number;
  asOf: string;
  positions: DepthChartPosition[];
}
