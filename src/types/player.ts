import { z } from "zod";
import {
  PositionCode,
  PositionGroup,
  EligibilityClass,
  ScholarshipStatus,
  PortalStatus,
  RecruitingStatus,
  EvaluationTier,
  Conference,
} from "./enums";
import { SchoolStampSchema } from "./school";

export { PortalStatus, RecruitingStatus };

/** The eligibility "value engine" (database-design.md §2.4). */
export const EligibilityBlockSchema = z.object({
  seasonsAllowed: z.number().default(4),
  seasonsUsed: z.number(),
  redshirtUsed: z.boolean(),
  extraYears: z.number().default(0),
  yearsRemaining: z.number().min(0).max(5),
  clockExpiresSeason: z.number().optional(),
  isGraduate: z.boolean(),
});
export type EligibilityBlock = z.infer<typeof EligibilityBlockSchema>;

export const Handedness = z.enum(["L", "R"]);

export const PlayerSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  currentSchoolId: z.string(),
  currentSchool: SchoolStampSchema,
  previousSchoolIds: z.array(z.string()).default([]),
  primaryPosition: PositionCode,
  secondaryPositions: z.array(PositionCode).default([]),
  positionGroup: PositionGroup,
  jerseyNumber: z.number().optional(),
  heightInches: z.number(),
  weightLbs: z.number(),
  handedness: Handedness.optional(),
  hometown: z.string().optional(),
  homeState: z.string().optional(),
  stars: z.number().min(0).max(5),
  compositeRating: z.number(),
  nationalRank: z.number().optional(),
  positionRank: z.number().optional(),
  eligibilityClass: EligibilityClass,
  eligibility: EligibilityBlockSchema,
  scholarshipStatus: ScholarshipStatus,
  portalStatus: PortalStatus.optional(),
  // Availability provenance (set by CFBD ingest, roster cross-check, or staff).
  statusSource: z.enum(["CFBD", "ROSTER_CHECK", "STAFF_OVERRIDE"]).optional(),
  availabilityCheckedAt: z.string().optional(),
  statusNote: z.string().optional(),
  // computed / cached
  fitScore: z.number().min(0).max(100).optional(),
  needScore: z.number().min(0).max(100).optional(),
  productionScore: z.number().min(0).max(100).optional(),
  undervaluation: z.number().optional(), // production pct − ranking pct (−100..100)
  recruitingStatus: RecruitingStatus.optional(),
  consensusTier: EvaluationTier.optional(),
  consensusGrade: z.number().optional(),
  awards: z.array(z.string()).default([]),
  injuryFlags: z.array(z.string()).default([]),
  characterFlags: z.array(z.string()).default([]),
  nilEstimate: z.number().optional(),
  aiInsightId: z.string().optional(),
  watchlistIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  computedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Player = z.infer<typeof PlayerSchema>;

/* ──────────────────────────────────────────────────────────────────────────
 * Portal search filters (consumed by SearchService / PlayerRepository.queryPlayers)
 * ────────────────────────────────────────────────────────────────────────── */

export const SortKey = z.enum([
  "fitScore",
  "compositeRating",
  "yearsRemaining",
  "productionScore",
  "undervaluation",
  "needScore",
  "lastName",
  "enteredPortal",
]);
export type SortKey = z.infer<typeof SortKey>;

export const PlayerFiltersSchema = z.object({
  q: z.string().optional(),
  positions: z.array(PositionCode).optional(),
  positionGroups: z.array(PositionGroup).optional(),
  conferences: z.array(Conference).optional(),
  schoolIds: z.array(z.string()).optional(),
  portalStatuses: z.array(PortalStatus).optional(),
  eligibilityClasses: z.array(EligibilityClass).optional(),
  minYearsRemaining: z.number().optional(),
  maxYearsRemaining: z.number().optional(),
  minHeightInches: z.number().optional(),
  maxHeightInches: z.number().optional(),
  minWeightLbs: z.number().optional(),
  maxWeightLbs: z.number().optional(),
  minStars: z.number().optional(),
  minComposite: z.number().optional(),
  minFitScore: z.number().optional(),
  powerOnly: z.boolean().optional(),
  undervaluedOnly: z.boolean().optional(),
  sortBy: SortKey.optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  limit: z.number().optional(),
});
export type PlayerFilters = z.infer<typeof PlayerFiltersSchema>;
