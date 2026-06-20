import { z } from "zod";
import { PositionCode } from "./_shared";
import { StaffRole } from "./user";

/**
 * End-to-end recruiting lifecycle. This is intentionally distinct from the
 * player-level RecruitingStatus rollup in enums.ts.
 */
export const RecruitingStatus = z.enum([
  "UNREVIEWED",
  "EVALUATED",
  "WATCHLIST",
  "CONTACTED",
  "OFFER_EXTENDED",
  "VISIT_SCHEDULED",
  "COMMITTED_ELSEWHERE",
  "COMMITTED_TO_US",
  "REMOVED_NOT_PURSUING",
]);
export type RecruitingStatus = z.infer<typeof RecruitingStatus>;

export const RecruitingPriority = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);
export type RecruitingPriority = z.infer<typeof RecruitingPriority>;

export const OfferStatus = z.enum([
  "NOT_EXTENDED",
  "UNDER_REVIEW",
  "EXTENDED",
  "ACCEPTED",
  "DECLINED",
  "WITHDRAWN",
]);
export type OfferStatus = z.infer<typeof OfferStatus>;

export const VisitStatus = z.enum([
  "NOT_SCHEDULED",
  "SCHEDULED",
  "COMPLETED",
  "CANCELED",
]);
export type VisitStatus = z.infer<typeof VisitStatus>;

export const RiskLevel = z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

/**
 * Lightweight owner stamp. It deliberately does not require a full User so a
 * future staff directory can replace the mock implementation independently.
 */
export const StaffOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: StaffRole.optional(),
  initials: z.string().optional(),
  photoUrl: z.string().optional(),
});
export type StaffOwner = z.infer<typeof StaffOwnerSchema>;

export const RecruitingActivityType = z.enum([
  "NOTE",
  "STATUS_CHANGE",
  "PRIORITY_CHANGE",
  "OWNER_CHANGE",
  "CALL",
  "TEXT",
  "EMAIL",
  "VISIT",
  "OFFER",
  "COMMITMENT",
  "SYSTEM",
]);
export type RecruitingActivityType = z.infer<typeof RecruitingActivityType>;

export const RecruitingActivitySchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  type: RecruitingActivityType,
  title: z.string(),
  detail: z.string().optional(),
  createdBy: StaffOwnerSchema.optional(),
  actor: StaffOwnerSchema.optional(),
  previousValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
  note: z.string().optional(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RecruitingActivity = z.infer<typeof RecruitingActivitySchema>;

export const RecruitingWorkflowSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  position: PositionCode,
  currentSchoolName: z.string(),
  status: RecruitingStatus,
  priority: RecruitingPriority,
  offerStatus: OfferStatus,
  visitStatus: VisitStatus,
  riskLevel: RiskLevel,
  priorityScore: z.number().min(0).max(100).default(0),
  owner: StaffOwnerSchema.optional(),
  nextAction: z.string().optional(),
  nextActionAt: z.string().optional(),
  lastContactAt: z.string().optional(),
  visitAt: z.string().optional(),
  offerExtendedAt: z.string().optional(),
  committedAt: z.string().optional(),
  signedAt: z.string().optional(),
  enrolledAt: z.string().optional(),
  activities: z.array(RecruitingActivitySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RecruitingWorkflow = z.infer<typeof RecruitingWorkflowSchema>;

export const RecruitingWorkflowFiltersSchema = z.object({
  orgId: z.string().optional(),
  playerId: z.string().optional(),
  statuses: z.array(RecruitingStatus).optional(),
  priorities: z.array(RecruitingPriority).optional(),
  ownerId: z.string().optional(),
  riskLevels: z.array(RiskLevel).optional(),
});
export type RecruitingWorkflowFilters = z.infer<
  typeof RecruitingWorkflowFiltersSchema
>;
