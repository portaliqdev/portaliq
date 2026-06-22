import { getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import { BoardClient } from "@/features/recruiting-board/BoardClient";
import { EmptyState } from "@/components/ui/EmptyState";
import { Columns3 } from "lucide-react";
import type { RecruitingPriority } from "@/types/recruiting-workflow";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const services = getServices();
  const [view, workflows] = await Promise.all([
    services.board.getBoardView(ORG_ID),
    services.workflow.listWorkflows(ORG_ID),
  ]);
  if (!view) {
    return <EmptyState icon={Columns3} title="No board yet" description="Create a board to start tracking prospects." />;
  }
  const workflowPriority: Record<string, RecruitingPriority> = Object.fromEntries(
    workflows.map((w) => [w.playerId, w.priority]),
  );
  return (
    <div className="h-full">
      <BoardClient view={view} workflowPriority={workflowPriority} />
    </div>
  );
}
