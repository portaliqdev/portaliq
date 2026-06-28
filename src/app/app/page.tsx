import Link from "next/link";
import { getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Stat";
import { PlayerCard } from "@/components/domain/PlayerCard";
import { PositionPill } from "@/components/domain/PositionPill";
import { FitScoreBadge } from "@/components/domain/FitScore";
import { PriorityBadge } from "@/components/domain/StatusBadge";
import { PercentileBar } from "@/components/domain/PercentileBar";
import type { DashboardAlert } from "@/services";
import { fmt } from "@/lib/utils";
import {
  Radar as RadarIcon,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Target,
  TrendingUp,
  Info,
  ClipboardCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ALERT_ICON = { danger: AlertTriangle, risk: AlertTriangle, target: Target, info: Info };
const ALERT_COLOR = { danger: "var(--sem-danger)", risk: "var(--sem-risk)", target: "var(--sem-target)", info: "var(--sem-info)" };

function AlertRow({ alert }: { alert: DashboardAlert }) {
  const Icon = ALERT_ICON[alert.tone];
  const color = ALERT_COLOR[alert.tone];
  return (
    <div
      className="flex gap-3 rounded-lg border border-hairline bg-surface-2 px-3 py-2.5 transition-colors hover:border-hairline-strong"
      style={{ borderLeftColor: color, borderLeftWidth: 2 }}
    >
      <Icon size={16} style={{ color }} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink">{alert.title}</div>
        <div className="text-[12px] text-ink-muted">{alert.detail}</div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getServices().dashboard.getDashboard(ORG_ID);
  const { org, kpis, newPortalPlayers, priorityRecruits, topNeeds, alerts, aiRecommendations, recentEvaluations } = data;
  const wf = await getServices().workflow.getMetrics(ORG_ID);

  return (
    <>
      <PageHeader
        eyebrow={`War Room · ${org.currentSeason} Cycle`}
        title="What to focus on today"
        description={`${org.name} football — portal intelligence across ${fmt(kpis.portalTotal)} scouted players, ${kpis.inPortal} active in the portal.`}
        actions={
          <Link href="/app/portal">
            <Button variant="primary">
              Open Transfer Portal <ArrowRight size={15} />
            </Button>
          </Link>
        }
      />

      <div className="space-y-7 p-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 stagger sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Portal Players" value={kpis.portalTotal} hint="scouted set" accent />
          <Stat label="In Portal Now" value={kpis.inPortal} hint="actively available" />
          <Stat label="On Our Board" value={kpis.boardSize} hint="tracked prospects" />
          <Stat label="Critical Needs" value={kpis.criticalNeeds} hint="positions" />
          <Stat label="Avg Board Fit" value={kpis.avgBoardFit} hint="0–100" />
          <Stat label="Undervalued" value={kpis.undervalued} hint="Moneyball flags" />
        </div>

        {/* Recruiting workflow metrics */}
        <div>
          <div className="eyebrow mb-2.5 flex items-center gap-1.5">
            <ClipboardCheck size={13} /> Recruiting Workflow
          </div>
          <div className="grid grid-cols-2 gap-3 stagger sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Tracked" value={wf.total} hint="in workflow" />
            <Stat label="High Priority" value={wf.highPriority} hint="targets" />
            <Stat label="Follow-ups Due" value={wf.needsActionToday} hint="today" />
            <Stat label="Contacted" value={wf.contacted} hint="players" />
            <Stat label="Offers" value={wf.offersExtended} hint="extended" />
            <Stat label="Visits" value={wf.visitsScheduled} hint="scheduled" />
            <Stat label="Commitments" value={wf.committedToUs} hint="to us" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2/3 */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader
                eyebrow="Just hit the portal"
                title="Newest Entrants"
                action={
                  <Link href="/app/portal" className="text-[12px] font-medium text-brand-500 transition-colors hover:text-brand-400">
                    View all →
                  </Link>
                }
              />
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {newPortalPlayers.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader eyebrow="Act now" title="Priority Recruits" />
              <div className="divide-y divide-hairline">
                {priorityRecruits.map((p) => (
                  <Link
                    key={p.id}
                    href={`/app/players/${p.id}`}
                    className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <PositionPill code={p.primaryPosition} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink transition-colors group-hover:text-brand-500">
                      {p.fullName}
                    </span>
                    <span className="hidden truncate text-[12px] text-ink-muted sm:block sm:w-40">
                      {p.currentSchool.name}
                    </span>
                    <span className="tnum text-[12px] text-ink-muted">{p.eligibility.yearsRemaining} yr</span>
                    <FitScoreBadge score={p.fitScore} size="sm" />
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader eyebrow="Staff activity" title="Recent Evaluations" />
              <div className="divide-y divide-hairline">
                {recentEvaluations.map(({ evaluation, playerName, position, fitScore }) => (
                  <div key={evaluation.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ClipboardCheck size={15} className="text-ink-muted" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                      <span className="font-medium">{evaluation.evaluatorName}</span>
                      <span className="text-ink-muted"> graded </span>
                      <span className="font-medium">{playerName}</span>
                      <span className="text-ink-muted"> ({position})</span>
                    </span>
                    <span className="hidden text-[11px] text-ink-muted sm:block">{evaluation.stage}</span>
                    <FitScoreBadge score={fitScore} size="sm" />
                  </div>
                ))}
                {recentEvaluations.length === 0 && (
                  <div className="px-4 py-8 text-center text-[13px] text-ink-muted">
                    No evaluations logged yet — graded prospects will appear here.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right 1/3 */}
          <div className="space-y-6">
            <Card>
              <CardHeader eyebrow="Heads up" title="Recruiting Alerts" />
              <div className="flex flex-col gap-2 p-3">
                {alerts.map((a) => (
                  <AlertRow key={a.id} alert={a} />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader
                eyebrow="Roster gaps"
                title="Top Position Needs"
                action={
                  <Link href="/app/needs" className="text-[12px] font-medium text-brand-500 transition-colors hover:text-brand-400">
                    Analyze →
                  </Link>
                }
              />
              <div className="space-y-2.5 p-4">
                {topNeeds.map((n) => (
                  <div key={n.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PositionPill code={n.position} size="sm" />
                        <PriorityBadge priority={n.priority} />
                      </div>
                      <span className="text-[11px] text-ink-muted">
                        {n.projectedReturning}/{n.idealDepth} returning
                      </span>
                    </div>
                    <PercentileBar label="Need" value={n.needScore} colorByBand={false} />
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader
                eyebrow="Intelligence"
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" /> AI Recommendations
                  </span>
                }
                action={
                  <Link href="/app/assistant" className="text-[12px] font-medium text-brand-500 transition-colors hover:text-brand-400">
                    Ask →
                  </Link>
                }
              />
              <div className="divide-y divide-hairline">
                {aiRecommendations.map((a) => (
                  <Link
                    key={a.id}
                    href={`/app/players/${a.playerId}`}
                    className="block px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <div className="flex items-start gap-2">
                      <TrendingUp size={14} className="mt-0.5 shrink-0 text-amber-400" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-ink">{a.headline}</div>
                        <div className="mt-0.5 line-clamp-2 text-[12px] text-ink-muted">{a.summary}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pb-2 text-[11px] text-ink-muted">
          <RadarIcon size={12} /> PortalIQ · deterministic mock dataset · {fmt(kpis.portalTotal)} players · all scores computed locally
        </div>
      </div>
    </>
  );
}
