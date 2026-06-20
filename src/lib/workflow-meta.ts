import type { RecruitingPriority, RecruitingStatus } from "@/types/recruiting-workflow";

type Tone = "neutral" | "evaluating" | "watching" | "contacted" | "offer" | "info" | "lost" | "commit" | "danger" | "gold" | "red";

export const WORKFLOW_STATUS_META: Record<RecruitingStatus, { label: string; tone: Tone }> = {
  UNREVIEWED: { label: "Unreviewed", tone: "neutral" },
  EVALUATED: { label: "Evaluated", tone: "evaluating" },
  WATCHLIST: { label: "Watchlist", tone: "watching" },
  CONTACTED: { label: "Contacted", tone: "contacted" },
  OFFER_EXTENDED: { label: "Offer Extended", tone: "offer" },
  VISIT_SCHEDULED: { label: "Visit Scheduled", tone: "info" },
  COMMITTED_ELSEWHERE: { label: "Committed Elsewhere", tone: "lost" },
  COMMITTED_TO_US: { label: "Committed To Us", tone: "commit" },
  REMOVED_NOT_PURSUING: { label: "Removed", tone: "danger" },
};

export const WORKFLOW_PRIORITY_META: Record<RecruitingPriority, { label: string; tone: Tone }> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "info" },
  HIGH: { label: "High", tone: "gold" },
  CRITICAL: { label: "Critical", tone: "red" },
};

export const WORKFLOW_STATUS_ORDER: RecruitingStatus[] = [
  "UNREVIEWED", "EVALUATED", "WATCHLIST", "CONTACTED", "OFFER_EXTENDED",
  "VISIT_SCHEDULED", "COMMITTED_TO_US", "COMMITTED_ELSEWHERE", "REMOVED_NOT_PURSUING",
];

export const WORKFLOW_PRIORITY_ORDER: RecruitingPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
