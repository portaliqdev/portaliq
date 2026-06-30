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
import { StatusSource, ReviewState } from "./availability";

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
  // ── Availability: portalStatus is the EFFECTIVE status the whole product
  // reads. It is computed by the availability service from three persisted
  // layers below, in precedence STAFF_OVERRIDE > ROSTER_CHECK > CFBD. See
  // src/types/availability.ts and src/services/availability.service.ts.
  portalStatus: PortalStatus.optional(),
  statusSource: StatusSource.optional(),
  statusReviewState: ReviewState.optional(),
  statusNote: z.string().optional(), // effective note (mirror of winning layer)
  statusEvidenceUrl: z.string().optional(),
  availabilityCheckedAt: z.string().optional(), // when effective was last recomputed
  // Layer 1 — raw CFBD feed.
  rawPortalStatus: PortalStatus.optional(),
  rawStatusUpdatedAt: z.string().optional(),
  // Layer 2 — verified official roster / school-source check.
  verifiedPortalStatus: PortalStatus.optional(),
  verifiedAt: z.string().optional(),
  verifiedNote: z.string().optional(),
  verifiedEvidenceUrl: z.string().optional(),
  // Layer 3 — staff override (authoritative until cleared).
  overridePortalStatus: PortalStatus.optional(),
  overrideAt: z.string().optional(),
  overrideNote: z.string().optional(),
  overrideEvidenceUrl: z.string().optional(),
  overrideActorId: z.string().optional(),
  overrideActorName: z.string().optional(),
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
  // Default available-player pool: when true, keep only effective IN_PORTAL.
  // Ignored if `portalStatuses` is set (an explicit, intentional status filter).
  availableOnly: z.boolean().optional(),
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
