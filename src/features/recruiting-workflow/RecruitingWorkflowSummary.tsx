import {
  CalendarClock,
  CircleDollarSign,
  Phone,
  UserRound,
} from "lucide-react";
import { cn, shortDate } from "@/lib/utils";
import { RecruitingPriorityBadge, RecruitingWorkflowBadge } from "./RecruitingWorkflowBadge";
import { OFFER_STATUS_LABELS } from "./meta";
import type { RecruitingWorkflow } from "./types";

function isOverdue(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

export function RecruitingWorkflowSummary({
  workflow,
  className,
  compact = false,
}: {
  workflow: RecruitingWorkflow;
  className?: string;
  compact?: boolean;
}) {
  const overdue = workflow.nextActionAt && isOverdue(workflow.nextActionAt);

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        <RecruitingWorkflowBadge status={workflow.status} />
        <RecruitingPriorityBadge priority={workflow.priority} />
        <span className="truncate text-[11px] text-ink-muted">
          {workflow.owner?.name ?? "Unassigned"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-hairline bg-surface-2/70 p-2.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <RecruitingWorkflowBadge status={workflow.status} />
        <RecruitingPriorityBadge priority={workflow.priority} />
      </div>

      <div className="mt-2 grid gap-1.5 text-[11px] text-ink-sub sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <UserRound size={12} className="shrink-0 text-ink-muted" />
          <span className="truncate">
            {workflow.owner?.name ?? "No relationship owner"}
          </span>
        </div>
        <div
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            overdue && "text-sem-danger",
          )}
        >
          <CalendarClock size={12} className="shrink-0" />
          <span className="truncate">
            {workflow.nextAction && workflow.nextActionAt
              ? `${workflow.nextAction} · ${shortDate(workflow.nextActionAt)}`
              : "No next action"}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <Phone size={12} className="shrink-0 text-ink-muted" />
          <span className="truncate">
            {workflow.lastContactAt
              ? `Last touch ${shortDate(workflow.lastContactAt)}`
              : "No contact logged"}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <CircleDollarSign size={12} className="shrink-0 text-ink-muted" />
          <span className="truncate">
            {OFFER_STATUS_LABELS[workflow.offerStatus]}
          </span>
        </div>
      </div>
    </div>
  );
}
