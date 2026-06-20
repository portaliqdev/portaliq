import { getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import { PortalView } from "@/features/transfer-portal/PortalView";
import type { RecruitingStatus } from "@/types/recruiting-workflow";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const services = getServices();
  const [players, facets, workflows] = await Promise.all([
    services.search.searchPortal({ sortBy: "fitScore", sortDir: "desc" }),
    services.search.facets(),
    services.workflow.listWorkflows(ORG_ID),
  ]);
  const workflowStatus: Record<string, RecruitingStatus> = Object.fromEntries(
    workflows.map((w) => [w.playerId, w.status]),
  );
  return (
    <div className="h-full">
      <PortalView players={players} facets={facets} initialQuery={searchParams.q ?? ""} workflowStatus={workflowStatus} />
    </div>
  );
}
