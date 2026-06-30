import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  RECRUITING_STATUS_META,
  PORTAL_STATUS_META,
  BOARD_STAGE_META,
  TIER_META,
  PRIORITY_META,
  RISK_META,
  REVIEW_STATE_META,
} from "./meta";
import type {
  RecruitingStatus,
  PortalStatus,
  BoardStage,
  EvaluationTier,
  NeedPriority,
  DepartureRisk,
} from "@/types/enums";
import type { StatusSource, ReviewState } from "@/types/availability";

export function RecruitingStatusBadge({ status }: { status?: RecruitingStatus }) {
  if (!status) return null;
  const m = RECRUITING_STATUS_META[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

export function PortalStatusBadge({ status }: { status?: PortalStatus }) {
  if (!status) return null;
  const m = PORTAL_STATUS_META[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

export function BoardStageBadge({ stage }: { stage: BoardStage }) {
  const m = BOARD_STAGE_META[stage];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function TierBadge({ tier }: { tier?: EvaluationTier }) {
  if (!tier) return null;
  const m = TIER_META[tier];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: NeedPriority }) {
  const m = PRIORITY_META[priority];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function RiskBadge({ risk }: { risk: DepartureRisk }) {
  const m = RISK_META[risk];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/**
 * A tiny provenance/verification glyph for a player's effective availability.
 * - VERIFIED (staff override / roster check) → a calm shield.
 * - UNVERIFIED / STALE → a muted or amber dot that nudges "confirm before acting".
 * - `available === false` is treated as attention-worthy so a no-longer-in-portal
 *   player reads even when the status was verified.
 * Pass `attentionOnly` to hide it entirely when nothing needs a second look.
 */
export function AvailabilityIndicator({
  source,
  reviewState,
  available,
  withLabel = false,
  attentionOnly = false,
}: {
  source?: StatusSource;
  reviewState?: ReviewState;
  available?: boolean;
  withLabel?: boolean;
  attentionOnly?: boolean;
}) {
  if (!reviewState) return null;
  const notAvailable = available === false;
  const stale = reviewState === "STALE";
  const unverified = reviewState === "UNVERIFIED";
  const verified = reviewState === "VERIFIED";
  const needsAttention = stale || unverified || notAvailable;
  if (attentionOnly && !needsAttention) return null;

  // Verified and still available → a quiet shield, no warning hue.
  if (verified && !notAvailable) {
    return (
      <ShieldCheck
        size={12}
        className="shrink-0 text-sem-success/70"
        aria-label="Verified availability"
      >
        <title>Verified availability{source === "STAFF_OVERRIDE" ? " · staff override" : " · roster check"}</title>
      </ShieldCheck>
    );
  }

  const tone = stale ? "text-sem-risk" : notAvailable ? "text-sem-lost" : "text-ink-muted";
  const label = notAvailable
    ? "Not available"
    : REVIEW_STATE_META[reviewState].label;
  const title = stale
    ? "CFBD status may be stale — confirm before acting"
    : notAvailable
      ? "Effective status is no longer In Portal"
      : "From the CFBD feed — not independently verified";

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", tone)} title={title}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {withLabel && <span className="text-[10px] font-medium">{label}</span>}
    </span>
  );
}
