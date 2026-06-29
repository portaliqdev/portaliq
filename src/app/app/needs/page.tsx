import Link from "next/link";
import { getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { PositionPill } from "@/components/domain/PositionPill";
import { FitScoreBadge } from "@/components/domain/FitScore";
import { PriorityBadge, RiskBadge } from "@/components/domain/StatusBadge";
import { PercentileBar } from "@/components/domain/PercentileBar";
import { RosterImpactChip } from "@/features/player-profile/RosterImpactCard";
import { fmt } from "@/lib/utils";
import { Sparkles, Target, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NeedsPage() {
  const services = getServices();
  const [view, recs, analysis] = await Promise.all([
    services.teamNeeds.getNeedsView(ORG_ID),
    services.teamNeeds.recommendations(ORG_ID, 3),
    services.ai.analyzeTeamNeeds(),
  ]);
  const { needs, depthChart, summary } = view;
  const impacts = await services.rosterImpact.forPlayers(
    ORG_ID,
    recs.flatMap((r) => r.targets),
  );

  return (
    <>
      <PageHeader
        eyebrow="Roster Construction"
        title="Team Needs"
        description="Per-position need scoring from the latest roster snapshot, projected departures, and incoming commits."
      />
      <div className="space-y-8 p-6">
        {/* AI analysis — hero of the page */}
        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl"
          />
          <div className="relative p-5">
            <div className="eyebrow mb-2 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" /> AI Roster Analysis
            </div>
            <p className="font-display text-[20px] font-bold leading-snug tracking-tight text-ink">
              {analysis.headline}
            </p>
            <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink-sub">
              {analysis.summary}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {analysis.priorities.map((pr) => (
                <div
                  key={pr.position}
                  className="rounded-lg bg-white/[0.03] p-3"
                  style={{ boxShadow: "inset 2px 0 0 0 var(--amber-500)" }}
                >
                  <div className="flex items-center justify-between">
                    <PositionPill code={pr.position as never} size="sm" />
                    <span className="font-display text-[15px] font-bold tnum text-amber-400">
                      {pr.needScore}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">{pr.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Summary metrics — smaller, supporting */}
        <div className="grid grid-cols-2 gap-3 stagger sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Critical Needs", value: summary.critical, accent: true },
            { label: "High Needs", value: summary.high },
            { label: "Total Depth Gaps", value: summary.totalGaps },
            { label: "Open Scholarships", value: summary.availableScholarships },
            { label: "Scholarships", value: `${summary.scholarshipsUsed}/${summary.scholarshipLimit}` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-1 px-4 py-3 shadow-card edge-highlight">
              <div className="eyebrow">{s.label}</div>
              <div
                className={
                  "mt-1 font-display text-[20px] font-bold tnum " +
                  (s.accent ? "text-sem-danger" : "text-ink")
                }
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Needs table */}
          <Card className="lg:col-span-2">
            <CardHeader eyebrow="Ranked by need" title="Position Needs" />
            <Table>
              <THead>
                {["Pos", "Priority", "Need", "Depth", "Depart", "Incoming", "Return"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </THead>
              <TBody>
                {needs.map((n) => (
                  <Tr key={n.id}>
                    <Td>
                      <PositionPill code={n.position} size="sm" />
                    </Td>
                    <Td>
                      <PriorityBadge priority={n.priority} />
                    </Td>
                    <Td className="w-40">
                      <PercentileBar label="" value={n.needScore} colorByBand={false} />
                    </Td>
                    <Td className="tnum text-ink-sub">
                      {n.currentDepth}/{n.idealDepth}
                    </Td>
                    <Td className="tnum text-sem-danger">{n.projectedDepartures}</Td>
                    <Td className="tnum text-sem-success">+{n.incomingCommits}</Td>
                    <Td className="tnum text-ink-sub">{n.projectedReturning}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>

          {/* Recommended targets — actionable shortlist */}
          <Card>
            <CardHeader
              eyebrow="Portal answers"
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Target size={14} /> Recommended Targets
                </span>
              }
            />
            <div className="divide-y divide-white/[0.04]">
              {recs.map(({ need, targets }) => (
                <div key={need.id} className="px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <PositionPill code={need.position} size="sm" />
                    <PriorityBadge priority={need.priority} />
                  </div>
                  <div className="space-y-0.5">
                    {targets.map((t) => (
                      <Link
                        key={t.id}
                        href={`/app/players/${t.id}`}
                        className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                            {t.fullName}
                          </span>
                          <span className="hidden text-[11px] text-ink-muted sm:block">
                            {t.currentSchool.name}
                          </span>
                          <FitScoreBadge score={t.fitScore} size="sm" />
                        </div>
                        {impacts.get(t.id) && (
                          <div className="mt-1">
                            <RosterImpactChip impact={impacts.get(t.id)!} />
                          </div>
                        )}
                      </Link>
                    ))}
                    {targets.length === 0 && (
                      <div className="px-2 text-[12px] text-ink-muted">
                        No portal options at this position.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Depth chart */}
        <Card>
          <CardHeader
            eyebrow="Latest snapshot"
            title="Depth Chart"
            action={
              <Link
                href="/app/portal"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-500 transition-colors hover:text-brand-400"
              >
                Fill gaps <ArrowRight size={12} />
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-2">
            {depthChart.positions.map((pos) => (
              <div key={pos.position} className="rounded-lg bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PositionPill code={pos.position} size="sm" />
                    <span className="text-[12px] font-medium text-ink-sub">
                      {fmt(pos.slots.length)}/{pos.idealDepth}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pos.slots.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-1.5 rounded-md bg-white/[0.04] px-1.5 py-1 text-[11px]"
                      title={`${s.eligibilityClass} · ${s.yearsRemaining}yr · ${s.departureRisk} risk`}
                    >
                      <span className="tnum text-ink-muted">{s.depthRank}</span>
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
