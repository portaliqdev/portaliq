import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { RecruitingStatus } from "@/types/recruiting-workflow";
import {
  WORKFLOW_PRIORITY_META,
  WORKFLOW_STATUS_META,
  type WorkflowTone,
} from "./meta";
import type { RecruitingPriority } from "./types";

const BADGE_TONE: Record<
  WorkflowTone,
  React.ComponentProps<typeof Badge>["tone"]
> = {
  neutral: "neutral",
  danger: "danger",
  risk: "risk",
  gold: "gold",
  info: "info",
  success: "success",
  evaluating: "evaluating",
  contacted: "contacted",
  commit: "commit",
  lost: "lost",
  offer: "offer",
};

export function RecruitingWorkflowBadge({
  status,
  priority,
  showPriority = false,
  className,
}: {
  status: RecruitingStatus;
  priority?: RecruitingPriority;
  showPriority?: boolean;
  className?: string;
}) {
  const statusMeta = WORKFLOW_STATUS_META[status];
  const priorityMeta = priority ? WORKFLOW_PRIORITY_META[priority] : undefined;
  const meta =
    showPriority && priorityMeta
      ? priorityMeta
      : statusMeta;

  return (
    <Badge
      tone={BADGE_TONE[meta.tone]}
      dot
      className={cn("whitespace-nowrap", className)}
    >
      {meta.label}
    </Badge>
  );
}

export function RecruitingPriorityBadge({
  priority,
  className,
}: {
  priority: RecruitingPriority;
  className?: string;
}) {
  const meta = WORKFLOW_PRIORITY_META[priority];
  return (
    <Badge
      tone={BADGE_TONE[meta.tone]}
      className={cn("whitespace-nowrap", className)}
    >
      {meta.label}
    </Badge>
  );
}
