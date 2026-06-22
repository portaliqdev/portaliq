import Link from "next/link";
import { getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 font-display text-stat-xl font-bold tnum text-ink">{value}</div>
      {hint && <div className="text-[11px] text-ink-muted">{hint}</div>}
    </Card>
  );
}

const ALERT_ICON = { danger: AlertTriangle, risk: AlertTriangle, target: Target, info: Info };
const ALERT_COLOR = { danger: "#EF4444", risk: "#F59E0B", target: "#FFD520", info: "#60A5FA" };

function AlertRow({ alert }: { alert: DashboardAlert }) {
  const Icon = ALERT_ICON[alert.tone];
  const color = ALERT_COLOR[alert.tone];
  return (
    <div className="flex gap-3 border-l-2 px-3 py-2.5" style={{ borderColor: color }}>
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
          <Link href="/portal">
            <Button variant="primary">
              Open Transfer Portal <ArrowRight size={15} />
            </Button>
          </Link>
        }
      />

      <div className="space-y-6 p-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Portal Players" value={fmt(kpis.portalTotal)} hint="scouted set" />
          <StatCard label="In Portal Now" value={fmt(kpis.inPortal)} hint="actively available" />
          <StatCard label="On Our Board" value={fmt(kpis.boardSize)} hint="tracked prospects" />
          <StatCard label="Critical Needs" value={fmt(kpis.criticalNeeds)} hint="positions" />
          <StatCard label="Avg Board Fit" value={kpis.avgBoardFit} hint="0–100" />
          <StatCard label="Undervalued" value={fmt(kpis.undervalued)} hint="Moneyball flags" />
        </div>

        {/* Recruiting workflow metrics */}
        <div>
          <div className="eyebrow mb-2 flex items-center gap-1.5"><ClipboardCheck size={13} /> Recruiting Workflow</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard label="Tracked" value={fmt(wf.total)} hint="in workflow" />
            <StatCard label="High Priority" value={fmt(wf.highPriority)} hint="targets" />
            <StatCard label="Follow-ups Due" value={fmt(wf.needsActionToday)} hint="today" />
            <StatCard label="Contacted" value={fmt(wf.contacted)} hint="players" />
            <StatCard label="Offers" value={fmt(wf.offersExtended)} hint="extended" />
            <StatCard label="Visits" value={fmt(wf.visitsScheduled)} hint="scheduled" />
            <StatCard label="Commitments" value={fmt(wf.committedToUs)} hint="to us" />
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
                  <Link href="/portal" className="text-[12px] font-medium text-md-red hover:underline">
                    View all
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
                    href={`/players/${p.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2"
                  >
                    <PositionPill code={p.primaryPosition} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
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
              </div>
            </Card>
          </div>

          {/* Right 1/3 */}
          <div className="space-y-6">
            <Card>
              <CardHeader eyebrow="Heads up" title="Recruiting Alerts" />
              <div className="flex flex-col gap-1 p-2">
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
                  <Link href="/needs" className="text-[12px] font-medium text-md-red hover:underline">
                    Analyze
                  </Link>
                }
              />
              <div className="space-y-2.5 p-4">
                {topNeeds.map((n) => (
                  <div key={n.id} className="space-y-1">
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
                    <Sparkles size={14} className="text-md-gold" /> AI Recommendations
                  </span>
                }
                action={
                  <Link href="/assistant" className="text-[12px] font-medium text-md-red hover:underline">
                    Ask
                  </Link>
                }
              />
              <div className="divide-y divide-hairline">
                {aiRecommendations.map((a) => (
                  <Link
                    key={a.id}
                    href={`/players/${a.playerId}`}
                    className="block px-4 py-3 hover:bg-surface-2"
                  >
                    <div className="flex items-start gap-2">
                      <TrendingUp size={14} className="mt-0.5 shrink-0 text-md-gold" />
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
