import type {
  OfferStatus,
  RecruitingActivity,
  RecruitingPriority,
  RecruitingStatus,
  RecruitingWorkflow,
  StaffOwner,
  VisitStatus,
} from "@/types/recruiting-workflow";

export type {
  OfferStatus,
  RecruitingActivity,
  RecruitingPriority,
  RecruitingStatus,
  RecruitingWorkflow,
  StaffOwner as RecruitingOwner,
  VisitStatus,
};

export const RECRUITING_PRIORITIES = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const satisfies readonly RecruitingPriority[];

export const NEXT_ACTION_TYPES = [
  "EVALUATE",
  "CALL",
  "TEXT",
  "FOLLOW_UP",
  "SCHEDULE_VISIT",
  "PREPARE_OFFER",
  "STAFF_REVIEW",
  "OTHER",
] as const;
export type NextActionType = (typeof NEXT_ACTION_TYPES)[number];

export const CONTACT_METHODS = ["CALL", "TEXT", "EMAIL"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const VISIT_TYPES = ["OFFICIAL", "UNOFFICIAL"] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export interface RecruitingWorkflowMetrics {
  total: number;
  byStatus: Record<RecruitingStatus, number>;
  byPriority: Record<RecruitingPriority, number>;
  unassigned: number;
  overdueNextActions: number;
  scheduledVisits: number;
  offersExtended: number;
  averagePriorityScore: number;
}

export interface RecruitingWorkflowMetricsFilters {
  ownerId?: string;
  positionGroup?: string;
  status?: RecruitingStatus;
  priority?: RecruitingPriority;
}

export interface SetNextActionInput {
  playerId: string;
  type: NextActionType;
  dueAt: string;
  summary: string;
}

export interface LogRecruitingContactInput {
  playerId: string;
  method: ContactMethod;
  occurredAt: string;
  outcome?: string;
  note?: string;
  nextAction?: string;
  nextActionAt?: string;
}

export interface ScheduleRecruitingVisitInput {
  playerId: string;
  type: VisitType;
  status?: Exclude<VisitStatus, "NOT_SCHEDULED">;
  startsAt: string;
  location?: string;
  notes?: string;
}

export interface UpdateRecruitingOfferInput {
  playerId: string;
  status: OfferStatus;
  extendedAt?: string;
  terms?: string;
  notes?: string;
}
