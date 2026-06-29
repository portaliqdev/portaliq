import Link from "next/link";
import { getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Stat";
import { CountUp } from "@/components/ui/CountUp";
import { PlayerCard } from "@/components/domain/PlayerCard";
import { TodaysActions } from "@/features/dashboard/TodaysActions";
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
const ALERT_COLOR = {
  danger: "var(--sem-danger)",
  risk: "var(--sem-risk)",
  target: "var(--sem-target)",
  info: "var(--sem-info)",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function AlertRow({ alert }: { alert: DashboardAlert }) {
  const Icon = ALERT_ICON[alert.tone];
  const color = ALERT_COLOR[alert.tone];
  return (
    <div className="flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
      <Icon size={15} style={{ color }} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink">{alert.title}</div>
        <div className="text-[12px] leading-relaxed text-ink-muted">{alert.detail}</div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getServices().dashboard.getDashboard(ORG_ID);
  const {
    org,
    kpis,
    newPortalPlayers,
    priorityRecruits,
    topNeeds,
    alerts,
    aiRecommendations,
    recentEvaluations,
  } = data;
  const [wf, actionGroups] = await Promise.all([
    getServices().workflow.getMetrics(ORG_ID),
    getServices().actions.getActionQueue(ORG_ID),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] pb-12">
      {/* Hero greeting */}
      <section className="flex flex-wrap items-end justify-between gap-4 px-6 pb-6 pt-8 animate-fade-up">
        <div className="min-w-0">
          <div className="eyebrow mb-2 flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sem-risk opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sem-risk" />
            </span>
            Winter Portal · Day 12 · 4 days left
          </div>
          <h1 className="font-display text-[30px] font-bold leading-tight tracking-tight text-ink">
            {greeting()}, {org.shortName ?? org.name}.
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-sub">
            {kpis.inPortal} players active in the portal · {fmt(kpis.portalTotal)} scouted ·{" "}
            {wf.needsActionToday} follow-ups need you today.
          </p>
        </div>
        <Link href="/app/portal">
          <Button variant="primary" size="lg">
            Open Transfer Portal <ArrowRight size={16} />
          </Button>
        </Link>
      </section>

      <div className="space-y-8 px-6">
        {/* Focus metrics — only the 4 that drive today's decisions */}
        <div className="grid grid-cols-2 gap-3 stagger lg:grid-cols-4">
          <Stat label="Priority Players" value={wf.highPriority} hint="high-priority targets" accent />
          <Stat label="Follow-ups Due" value={wf.needsActionToday} hint="action needed today" />
          <Stat label="Critical Needs" value={kpis.criticalNeeds} hint="positions to fill" />
          <Stat label="In Portal Now" value={kpis.inPortal} hint="available to recruit" />
        </div>

        {/* The command-center queue — primary focus of the page */}
        <section>
          <div className="eyebrow mb-3 flex items-center gap-1.5">
            <ClipboardCheck size={13} /> Priority queue
          </div>
          <TodaysActions groups={actionGroups} />
        </section>

        {/* Primary working area */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2/3 */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader
                eyebrow="Just hit the portal"
                title="Newest Entrants"
                action={
                  <Link
                    href="/app/portal"
                    className="text-[12px] font-medium text-brand-500 transition-colors hover:text-brand-400"
                  >
                    View all →
                  </Link>
                }
              />
              <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
                {newPortalPlayers.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader eyebrow="Act now" title="Priority Recruits" />
              <div className="px-2 pb-2">
                {priorityRecruits.map((p) => (
                  <Link
                    key={p.id}
                    href={`/app/players/${p.id}`}
                    className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <PositionPill code={p.primaryPosition} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink transition-colors group-hover:text-brand-500">
                      {p.fullName}
                    </span>
                    <span className="hidden truncate text-[12px] text-ink-muted sm:block sm:w-40">
                      {p.currentSchool.name}
                    </span>
                    <span className="tnum text-[12px] text-ink-muted">
                      {p.eligibility.yearsRemaining} yr
                    </span>
                    <FitScoreBadge score={p.fitScore} size="sm" />
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader eyebrow="Staff activity" title="Recent Evaluations" />
              <div className="px-2 pb-2">
                {recentEvaluations.map(({ evaluation, playerName, position, fitScore }) => (
                  <div key={evaluation.id} className="flex items-center gap-3 px-2.5 py-2.5">
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
              <div className="flex flex-col px-2 pb-2">
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
                  <Link
                    href="/app/needs"
                    className="text-[12px] font-medium text-brand-500 transition-colors hover:text-brand-400"
                  >
                    Analyze →
                  </Link>
                }
              />
              <div className="space-y-3 px-4 pb-4">
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
                    <PercentileBar label="" value={n.needScore} colorByBand={false} />
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
                  <Link
                    href="/app/assistant"
                    className="text-[12px] font-medium text-brand-500 transition-colors hover:text-brand-400"
                  >
                    Ask →
                  </Link>
                }
              />
              <div className="px-2 pb-2">
                {aiRecommendations.map((a) => (
                  <Link
                    key={a.id}
                    href={`/app/players/${a.playerId}`}
                    className="block rounded-lg px-2.5 py-2.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="flex items-start gap-2">
                      <TrendingUp size={14} className="mt-0.5 shrink-0 text-amber-400" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-ink">{a.headline}</div>
                        <div className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">
                          {a.summary}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Secondary metrics — the full pipeline, quieter and lower */}
        <section>
          <div className="eyebrow mb-3">Pipeline at a glance</div>
          <Card>
            <div className="grid grid-cols-2 divide-x divide-y divide-hairline sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
              {[
                { label: "Tracked", value: wf.total },
                { label: "Contacted", value: wf.contacted },
                { label: "Offers Out", value: wf.offersExtended },
                { label: "Visits Set", value: wf.visitsScheduled },
                { label: "Commitments", value: wf.committedToUs },
                { label: "Undervalued", value: kpis.undervalued },
              ].map((s) => (
                <div key={s.label} className="px-4 py-3.5">
                  <div className="eyebrow">{s.label}</div>
                  <div className="mt-1 font-display text-[22px] font-bold tnum text-ink">
                    <CountUp value={s.value} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-ink-muted">
          <RadarIcon size={12} /> PortalIQ · deterministic mock dataset · {fmt(kpis.portalTotal)} players
          · all scores computed locally
        </div>
      </div>
    </div>
  );
}
