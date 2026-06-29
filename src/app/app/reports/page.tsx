import Link from "next/link";
import { getServices } from "@/lib/di";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { PositionPill } from "@/components/domain/PositionPill";
import { FitScoreBadge } from "@/components/domain/FitScore";
import { StarRating } from "@/components/domain/StarRating";
import { POSITION_GROUP_HEX } from "@/types/enums";
import { fmt, cn } from "@/lib/utils";
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

  const avgFit = bigBoard.length
    ? Math.round(bigBoard.reduce((s, p) => s + (p.fitScore ?? 0), 0) / bigBoard.length)
    : 0;
  const maxUv = Math.max(1, ...undervalued.map((p) => p.undervaluation ?? 0));

  const summary = [
    { label: "Players Ranked", value: fmt(bigBoard.length) },
    { label: "Avg Board Fit", value: String(avgFit) },
    { label: "Undervalued", value: fmt(undervalued.length) },
    { label: "Conferences", value: fmt(confs.length) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Output"
        title="Reports"
        description="Auto-generated portal rankings, position boards, Moneyball signals, and conference breakdowns."
      />
      <div className="space-y-8 p-6">
        {/* Summary band */}
        <div className="grid grid-cols-2 gap-3 stagger lg:grid-cols-4">
          {summary.map((s, i) => (
            <div
              key={s.label}
              className="rounded-xl bg-surface-1 px-4 py-3.5 shadow-card edge-highlight"
            >
              <div className="eyebrow">{s.label}</div>
              <div
                className={cn(
                  "mt-1 font-display text-[24px] font-bold tnum",
                  i === 1 ? "text-brand-500" : "text-ink",
                )}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Big board */}
          <Card className="lg:col-span-2">
            <CardHeader eyebrow="Ranked by fit" title="Portal Big Board — Top 25" />
            <Table>
              <THead>
                {["#", "Pos", "Player", "School", "Conf", "Yrs", "★", "Fit"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </THead>
              <TBody>
                {bigBoard.map((p, i) => (
                  <Tr key={p.id}>
                    <Td className="font-display font-bold tnum text-ink-muted">{i + 1}</Td>
                    <Td>
                      <PositionPill code={p.primaryPosition} size="sm" />
                    </Td>
                    <Td>
                      <Link
                        href={`/app/players/${p.id}`}
                        className="font-medium text-ink hover:text-brand-500"
                      >
                        {p.fullName}
                      </Link>
                    </Td>
                    <Td className="text-ink-sub">{p.currentSchool.name}</Td>
                    <Td className="text-ink-muted">{p.currentSchool.conference}</Td>
                    <Td className="tnum text-ink-sub">{p.eligibility.yearsRemaining}</Td>
                    <Td>
                      <StarRating stars={p.stars} />
                    </Td>
                    <Td>
                      <FitScoreBadge score={p.fitScore} size="sm" />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>

          {/* Undervalued — Moneyball insight module with mini bars */}
          <Card>
            <CardHeader
              eyebrow="Moneyball"
              title={
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-amber-400" /> Most Undervalued
                </span>
              }
            />
            <div className="px-2 pb-2">
              {undervalued.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/app/players/${p.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.03]"
                >
                  <span className="w-4 font-display text-[12px] font-bold tnum text-ink-muted">
                    {i + 1}
                  </span>
                  <PositionPill code={p.primaryPosition} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{p.fullName}</span>
                  <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-3 sm:block">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${((p.undervaluation ?? 0) / maxUv) * 100}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-[12px] font-semibold tnum text-amber-400">
                    +{p.undervaluation}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Position rankings */}
        <section>
          <div className="eyebrow mb-3">Position Rankings</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {byGroup.map((r) => (
              <Card key={r.group}>
                <div className="flex items-center gap-2 px-4 pb-2 pt-3.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: POSITION_GROUP_HEX[r.group] }}
                  />
                  <span className="font-display text-[13px] font-semibold uppercase tracking-wide text-ink">
                    {r.group}
                  </span>
                </div>
                <div className="px-2 pb-2">
                  {r.players.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/app/players/${p.id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="w-4 text-[11px] tnum text-ink-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                        {p.fullName}
                      </span>
                      <FitScoreBadge score={p.fitScore} size="sm" />
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Conference breakdown */}
        <Card>
          <CardHeader eyebrow="Where the talent is" title="Conference Breakdown" />
          <Table>
            <THead>
              {["Conference", "Players", "Avg Fit", "Top Available"].map((h) => (
                <Th key={h} className="px-4">
                  {h}
                </Th>
              ))}
            </THead>
            <TBody>
              {confs.map((c) => (
                <Tr key={c.conference}>
                  <Td className="px-4 font-medium text-ink">{c.conference}</Td>
                  <Td className="px-4 tnum text-ink-sub">{fmt(c.count)}</Td>
                  <Td className="px-4">
                    <FitScoreBadge score={c.avgFit} size="sm" />
                  </Td>
                  <Td className="px-4 text-ink-sub">{c.topPlayer}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>
    </>
  );
}
