import { Badge } from "@/components/ui/Badge";
import {
  RECRUITING_STATUS_META,
  PORTAL_STATUS_META,
  BOARD_STAGE_META,
  TIER_META,
  PRIORITY_META,
  RISK_META,
} from "./meta";
import type {
  RecruitingStatus,
  PortalStatus,
  BoardStage,
  EvaluationTier,
  NeedPriority,
  DepartureRisk,
} from "@/types/enums";

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
