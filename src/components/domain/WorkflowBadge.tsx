import { Badge } from "@/components/ui/Badge";
import { WORKFLOW_STATUS_META, WORKFLOW_PRIORITY_META } from "@/lib/workflow-meta";
import type { RecruitingPriority, RecruitingStatus } from "@/types/recruiting-workflow";

export function WorkflowStatusBadge({ status }: { status?: RecruitingStatus }) {
  if (!status) return null;
  const m = WORKFLOW_STATUS_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function WorkflowPriorityBadge({ priority }: { priority?: RecruitingPriority }) {
  if (!priority) return null;
  const m = WORKFLOW_PRIORITY_META[priority];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}
