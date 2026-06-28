import Link from "next/link";
import { getServices } from "@/lib/di";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { PositionPill } from "@/components/domain/PositionPill";
import { FitScoreBadge } from "@/components/domain/FitScore";
import { StarRating } from "@/components/domain/StarRating";
import { POSITION_GROUP_HEX } from "@/types/enums";
import { fmt, ordinal } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const services = getServices();
  const [bigBoard, byGroup, undervalued, confs] = await Promise.all([
    services.reports.bigBoard(25),
    services.reports.byPositionGroup(6),
    services.reports.undervalued(15),
    services.reports.conferenceBreakdown(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Output"
        title="Reports"
        description="Auto-generated portal rankings, position boards, Moneyball signals, and conference breakdowns."
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Big board */}
          <Card className="lg:col-span-2">
            <CardHeader eyebrow="Ranked by fit" title="Portal Big Board — Top 25" />
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-hairline text-left">
                    {["#", "Pos", "Player", "School", "Conf", "Yrs", "★", "Fit"].map((h) => (
                      <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bigBoard.map((p, i) => (
                    <tr key={p.id} className="border-b border-hairline hover:bg-surface-2">
                      <td className="px-3 py-1.5 font-display text-[13px] font-bold tnum text-ink-muted">{i + 1}</td>
                      <td className="px-3 py-1.5"><PositionPill code={p.primaryPosition} size="sm" /></td>
                      <td className="px-3 py-1.5"><Link href={`/app/players/${p.id}`} className="font-medium text-ink hover:text-brand-500">{p.fullName}</Link></td>
                      <td className="px-3 py-1.5 text-ink-sub">{p.currentSchool.name}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{p.currentSchool.conference}</td>
                      <td className="px-3 py-1.5 tnum text-ink-sub">{p.eligibility.yearsRemaining}</td>
                      <td className="px-3 py-1.5"><StarRating stars={p.stars} /></td>
                      <td className="px-3 py-1.5"><FitScoreBadge score={p.fitScore} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Undervalued */}
          <Card>
            <CardHeader eyebrow="Moneyball" title={<span className="inline-flex items-center gap-1.5"><TrendingUp size={14} className="text-amber-400" /> Most Undervalued</span>} />
            <div className="divide-y divide-hairline">
              {undervalued.map((p, i) => (
                <Link key={p.id} href={`/app/players/${p.id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2">
                  <span className="w-5 font-display text-[12px] font-bold tnum text-ink-muted">{i + 1}</span>
                  <PositionPill code={p.primaryPosition} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{p.fullName}</span>
                  <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-amber-400 tnum">+{p.undervaluation}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Position rankings */}
        <div>
          <div className="eyebrow mb-3">Position Rankings</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {byGroup.map((r) => (
              <Card key={r.group}>
                <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: POSITION_GROUP_HEX[r.group] }} />
                  <span className="font-display text-[13px] font-semibold uppercase tracking-wide text-ink">{r.group}</span>
                </div>
                <div className="divide-y divide-hairline">
                  {r.players.map((p, i) => (
                    <Link key={p.id} href={`/app/players/${p.id}`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-2">
                      <span className="w-4 text-[11px] tnum text-ink-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{p.fullName}</span>
                      <FitScoreBadge score={p.fitScore} size="sm" />
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Conference breakdown */}
        <Card>
          <CardHeader eyebrow="Where the talent is" title="Conference Breakdown" />
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-hairline text-left">
                  {["Conference", "Players", "Avg Fit", "Top Available"].map((h) => (
                    <th key={h} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confs.map((c) => (
                  <tr key={c.conference} className="border-b border-hairline hover:bg-surface-2">
                    <td className="px-4 py-2 font-medium text-ink">{c.conference}</td>
                    <td className="px-4 py-2 tnum text-ink-sub">{fmt(c.count)}</td>
                    <td className="px-4 py-2"><FitScoreBadge score={c.avgFit} size="sm" /></td>
                    <td className="px-4 py-2 text-ink-sub">{c.topPlayer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
