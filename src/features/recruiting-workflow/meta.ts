import type {
  OfferStatus,
  RecruitingActivityType,
  RecruitingPriority,
  RecruitingStatus,
  VisitStatus,
} from "@/types/recruiting-workflow";
import type { NextActionType } from "./types";

export type WorkflowTone =
  | "neutral"
  | "danger"
  | "risk"
  | "gold"
  | "info"
  | "success"
  | "evaluating"
  | "contacted"
  | "commit"
  | "lost"
  | "offer";

export const WORKFLOW_STATUS_META: Record<
  RecruitingStatus,
  { label: string; tone: WorkflowTone }
> = {
  UNREVIEWED: { label: "Unreviewed", tone: "neutral" },
  EVALUATED: { label: "Evaluated", tone: "evaluating" },
  WATCHLIST: { label: "Watchlist", tone: "gold" },
  CONTACTED: { label: "Contacted", tone: "contacted" },
  OFFER_EXTENDED: { label: "Offer Extended", tone: "offer" },
  VISIT_SCHEDULED: { label: "Visit Scheduled", tone: "info" },
  COMMITTED_ELSEWHERE: { label: "Committed Elsewhere", tone: "lost" },
  COMMITTED_TO_US: { label: "Committed To Us", tone: "commit" },
  REMOVED_NOT_PURSUING: { label: "Removed / Not Pursuing", tone: "neutral" },
};

export const WORKFLOW_PRIORITY_META: Record<
  RecruitingPriority,
  { label: string; tone: WorkflowTone }
> = {
  CRITICAL: { label: "Critical", tone: "danger" },
  HIGH: { label: "High", tone: "risk" },
  MEDIUM: { label: "Medium", tone: "gold" },
  LOW: { label: "Low", tone: "info" },
};

export const NEXT_ACTION_LABELS: Record<NextActionType, string> = {
  EVALUATE: "Evaluate",
  CALL: "Call",
  TEXT: "Text",
  FOLLOW_UP: "Follow up",
  SCHEDULE_VISIT: "Schedule visit",
  PREPARE_OFFER: "Prepare offer",
  STAFF_REVIEW: "Staff review",
  OTHER: "Other",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  NOT_EXTENDED: "Not extended",
  UNDER_REVIEW: "Under review",
  EXTENDED: "Extended",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  NOT_SCHEDULED: "Not scheduled",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

export const ACTIVITY_LABELS: Record<RecruitingActivityType, string> = {
  NOTE: "Note",
  STATUS_CHANGE: "Status",
  PRIORITY_CHANGE: "Priority",
  OWNER_CHANGE: "Owner",
  CALL: "Call",
  TEXT: "Text",
  EMAIL: "Email",
  VISIT: "Visit",
  OFFER: "Offer",
  COMMITMENT: "Commitment",
  SYSTEM: "System",
};
