import type { RecruitingStatus, PortalStatus, BoardStage, EvaluationTier, NeedPriority, DepartureRisk } from "@/types/enums";
import type { ReviewState } from "@/types/availability";

type Tone =
  | "neutral" | "red" | "gold" | "success" | "commit" | "target" | "contacted"
  | "evaluating" | "watching" | "offer" | "risk" | "danger" | "lost" | "info";

export const RECRUITING_STATUS_META: Record<RecruitingStatus, { label: string; tone: Tone }> = {
  UNEVALUATED: { label: "Unevaluated", tone: "watching" },
  EVALUATING: { label: "Evaluating", tone: "evaluating" },
  TARGET: { label: "Target", tone: "contacted" },
  HOT: { label: "Hot", tone: "target" },
  COMMITTED_TO_US: { label: "Committed", tone: "commit" },
  LOST: { label: "Lost", tone: "lost" },
  OFF_BOARD: { label: "Off Board", tone: "neutral" },
};

export const PORTAL_STATUS_META: Record<PortalStatus, { label: string; tone: Tone }> = {
  IN_PORTAL: { label: "In Portal", tone: "contacted" },
  COMMITTED: { label: "Committed", tone: "commit" },
  WITHDRAWN: { label: "Withdrawn", tone: "lost" },
  ENROLLED: { label: "Enrolled", tone: "success" },
};

/** Confidence in a player's effective availability — provenance/trust signal. */
export const REVIEW_STATE_META: Record<ReviewState, { label: string; tone: Tone }> = {
  VERIFIED: { label: "Verified", tone: "success" },
  UNVERIFIED: { label: "Unverified", tone: "neutral" },
  STALE: { label: "Stale", tone: "risk" },
};

export const BOARD_STAGE_META: Record<BoardStage, { label: string; tone: Tone }> = {
  NEEDS_REVIEW: { label: "Needs Review", tone: "watching" },
  EVALUATING: { label: "Evaluating", tone: "evaluating" },
  CONTACTED: { label: "Contacted", tone: "contacted" },
  MUTUAL_INTEREST: { label: "Mutual Interest", tone: "gold" },
  VISIT_SCHEDULED: { label: "Visit Scheduled", tone: "info" },
  OFFER_EXTENDED: { label: "Offer Extended", tone: "offer" },
  COMMITTED: { label: "Committed", tone: "commit" },
  LOST: { label: "Lost", tone: "lost" },
};

export const TIER_META: Record<EvaluationTier, { label: string; tone: Tone }> = {
  CHAMPION: { label: "Champion", tone: "gold" },
  STARTER: { label: "Starter", tone: "success" },
  CONTRIBUTOR: { label: "Contributor", tone: "contacted" },
  DEVELOPMENTAL: { label: "Developmental", tone: "risk" },
  DO_NOT_RECRUIT: { label: "Pass", tone: "danger" },
};

export const PRIORITY_META: Record<NeedPriority, { label: string; tone: Tone }> = {
  CRITICAL: { label: "Critical", tone: "danger" },
  HIGH: { label: "High", tone: "risk" },
  MEDIUM: { label: "Medium", tone: "gold" },
  LOW: { label: "Low", tone: "contacted" },
  NONE: { label: "Set", tone: "success" },
};

export const RISK_META: Record<DepartureRisk, { label: string; tone: Tone }> = {
  NONE: { label: "Stable", tone: "success" },
  LOW: { label: "Low", tone: "contacted" },
  MED: { label: "Medium", tone: "risk" },
  HIGH: { label: "High", tone: "danger" },
};

/** Color band for a fit/grade score — luminous dark-mode fit ramp. */
export function fitBand(score: number): { tone: Tone; hex: string; label: string } {
  if (score >= 90) return { tone: "commit", hex: "#2dd4bf", label: "Elite" };
  if (score >= 75) return { tone: "success", hex: "#34d399", label: "Strong" };
  if (score >= 60) return { tone: "gold", hex: "#fbbf24", label: "Solid" };
  if (score >= 45) return { tone: "risk", hex: "#fb923c", label: "Marginal" };
  return { tone: "danger", hex: "#f87171", label: "Poor" };
}
