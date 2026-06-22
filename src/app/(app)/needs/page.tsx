import Link from "next/link";
import { getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { PositionPill } from "@/components/domain/PositionPill";
import { FitScoreBadge } from "@/components/domain/FitScore";
import { PriorityBadge, RiskBadge } from "@/components/domain/StatusBadge";
import { PercentileBar } from "@/components/domain/PercentileBar";
import { fmt } from "@/lib/utils";
import { Sparkles, Target, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 font-display text-stat-xl font-bold tnum text-ink">{value}</div>
      {hint && <div className="text-[11px] text-ink-muted">{hint}</div>}
    </Card>
  );
}

export default async function NeedsPage() {
  const services = getServices();
  const [view, recs, analysis] = await Promise.all([
    services.teamNeeds.getNeedsView(ORG_ID),
    services.teamNeeds.recommendations(ORG_ID, 3),
    services.ai.analyzeTeamNeeds(),
  ]);
  const { needs, depthChart, summary } = view;

  return (
    <>
      <PageHeader
        eyebrow="Roster Construction"
        title="Team Needs"
        description="Per-position need scoring from the latest roster snapshot, projected departures, and incoming commits."
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi label="Critical Needs" value={summary.critical} hint="positions" />
          <Kpi label="High Needs" value={summary.high} hint="positions" />
          <Kpi label="Total Depth Gaps" value={summary.totalGaps} hint="below ideal" />
          <Kpi label="Open Scholarships" value={summary.availableScholarships} hint="projected" />
          <Kpi label="Scholarships" value={`${summary.scholarshipsUsed}/${summary.scholarshipLimit}`} hint="on roster" />
        </div>

        {/* AI analysis */}
        <Card>
          <CardHeader
            eyebrow="Intelligence"
            title={<span className="inline-flex items-center gap-1.5"><Sparkles size={15} className="text-md-gold" /> AI Roster Analysis</span>}
          />
          <div className="space-y-3 p-4">
            <p className="font-display text-[15px] font-semibold text-ink">{analysis.headline}</p>
            <p className="text-[13px] text-ink-sub">{analysis.summary}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {analysis.priorities.map((pr) => (
                <div key={pr.position} className="rounded-md border border-hairline bg-surface-2 p-2.5">
                  <div className="flex items-center justify-between">
                    <PositionPill code={pr.position as never} size="sm" />
                    <span className="font-display text-[15px] font-bold tnum text-md-gold">{pr.needScore}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-muted">{pr.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Needs table */}
          <Card className="lg:col-span-2">
            <CardHeader eyebrow="Ranked by need" title="Position Needs" />
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-hairline text-left">
                    {["Pos", "Priority", "Need", "Depth", "Depart", "Incoming", "Return"].map((h) => (
                      <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {needs.map((n) => (
                    <tr key={n.id} className="border-b border-hairline hover:bg-surface-2">
                      <td className="px-3 py-2"><PositionPill code={n.position} size="sm" /></td>
                      <td className="px-3 py-2"><PriorityBadge priority={n.priority} /></td>
                      <td className="w-40 px-3 py-2"><PercentileBar label="" value={n.needScore} colorByBand={false} /></td>
                      <td className="px-3 py-2 tnum text-ink-sub">{n.currentDepth}/{n.idealDepth}</td>
                      <td className="px-3 py-2 tnum text-sem-danger">{n.projectedDepartures}</td>
                      <td className="px-3 py-2 tnum text-sem-success">+{n.incomingCommits}</td>
                      <td className="px-3 py-2 tnum text-ink-sub">{n.projectedReturning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader
              eyebrow="Portal answers"
              title={<span className="inline-flex items-center gap-1.5"><Target size={14} /> Recommended Targets</span>}
            />
            <div className="divide-y divide-hairline">
              {recs.map(({ need, targets }) => (
                <div key={need.id} className="px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <PositionPill code={need.position} size="sm" />
                    <PriorityBadge priority={need.priority} />
                  </div>
                  <div className="space-y-1">
                    {targets.map((t) => (
                      <Link key={t.id} href={`/players/${t.id}`} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-surface-2">
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{t.fullName}</span>
                        <span className="text-[11px] text-ink-muted">{t.currentSchool.name}</span>
                        <FitScoreBadge score={t.fitScore} size="sm" />
                      </Link>
                    ))}
                    {targets.length === 0 && <div className="text-[12px] text-ink-muted">No portal options at this position.</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Depth chart */}
        <Card>
          <CardHeader eyebrow="Latest snapshot" title="Depth Chart" action={<Link href="/portal" className="inline-flex items-center gap-1 text-[12px] text-md-red hover:underline">Fill gaps <ArrowRight size={12} /></Link>} />
          <div className="grid grid-cols-1 gap-px bg-hairline md:grid-cols-2">
            {depthChart.positions.map((pos) => (
              <div key={pos.position} className="bg-surface-1 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PositionPill code={pos.position} size="sm" />
                    <span className="text-[12px] font-medium text-ink-sub">{fmt(pos.slots.length)}/{pos.idealDepth}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pos.slots.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-1.5 rounded border border-hairline bg-surface-2 px-1.5 py-1 text-[11px]"
                      title={`${s.eligibilityClass} · ${s.yearsRemaining}yr · ${s.departureRisk} risk`}
                    >
                      <span className="text-ink-muted tnum">{s.depthRank}</span>
                      <span className="text-ink-sub">{s.playerName}</span>
                      {s.departureRisk === "HIGH" && <RiskBadge risk={s.departureRisk} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
