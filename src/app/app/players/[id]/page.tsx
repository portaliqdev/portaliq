import Link from "next/link";
import { notFound } from "next/navigation";
import { getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/Card";
import { FitDial } from "@/components/domain/FitScore";
import { PositionPill } from "@/components/domain/PositionPill";
import { StarRating } from "@/components/domain/StarRating";
import {
  PortalStatusBadge,
  RecruitingStatusBadge,
  TierBadge,
} from "@/components/domain/StatusBadge";
import { Radar } from "@/components/domain/Radar";
import { PercentileBar } from "@/components/domain/PercentileBar";
import { ScoutingReportCard } from "@/features/player-profile/ScoutingReportCard";
import { AddToBoardButton } from "@/features/player-profile/AddToBoardButton";
import { AvailabilityControl } from "@/features/player-profile/AvailabilityControl";
import { WorkflowPanel } from "@/features/player-profile/WorkflowPanel";
import { RosterImpactCard } from "@/features/player-profile/RosterImpactCard";
import { Badge } from "@/components/ui/Badge";
import { formatHeight, formatWeight, longDate, fmt, clamp } from "@/lib/utils";
import { pedigreeScore } from "@/lib/scoring";
import { PROFILES } from "@/lib/mock-data/position-profiles";
import { POSITION_META, POSITION_GROUP_HEX } from "@/types/enums";
import type { Player } from "@/types/player";
import type { PlayerMeasurements } from "@/types/stats";
import {
  ChevronLeft,
  MapPin,
  GraduationCap,
  Film,
  Users,
  ArrowRight,
  AlertTriangle,
  Ruler,
  Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STAT_LABELS: Record<string, string> = {
  passYards: "Pass Yds", passTD: "Pass TD", interceptions: "INT", completionPct: "Comp %",
  yardsPerAttempt: "Y/A", qbRating: "QB Rating", rushYards: "Rush Yds", rushTD: "Rush TD",
  rushAttempts: "Carries", yardsPerCarry: "Y/C", receptions: "Rec", recYards: "Rec Yds",
  recTD: "Rec TD", targets: "Targets", dropRate: "Drop %", yardsAfterCatch: "YAC",
  yardsPerReception: "Y/R", sacks: "Sacks", pressures: "Pressures", tacklesForLoss: "TFL",
  tackles: "Tackles", passBreakups: "PBU", passBlockGrade: "Pass-Blk", runBlockGrade: "Run-Blk",
  pressuresAllowed: "Press Allowed", coverageGrade: "Coverage", missedTacklePct: "Miss Tkl %",
  fgPct: "FG %", longFG: "Long FG", netPuntAvg: "Net Punt", passerRatingAllowed: "Rating Allowed",
};

function humanize(key: string): string {
  return STAT_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function athleticism(meas?: PlayerMeasurements): number {
  if (!meas) return 55;
  let score = 55;
  if (meas.fortyYard) score = clamp(((5.5 - meas.fortyYard) / (5.5 - 4.3)) * 100, 10, 100);
  if (meas.verticalInches) score = (score + clamp(((meas.verticalInches - 22) / 22) * 100, 10, 100)) / 2;
  return Math.round(score);
}

function sizeScore(p: Player): number {
  const prof = PROFILES[p.primaryPosition];
  const mid = (prof.weight[0] + prof.weight[1]) / 2;
  const spread = (prof.weight[1] - prof.weight[0]) / 2 || 10;
  const dist = Math.abs(p.weightLbs - mid);
  return Math.round(clamp(100 - (dist / (spread * 2)) * 55, 30, 100));
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="font-display text-[15px] font-semibold tnum text-ink">{value}</div>
    </div>
  );
}

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const services = getServices();
  const detail = await services.search.getPlayerDetail(params.id);
  if (!detail) notFound();
  const report = await services.ai.generateScoutingReport(params.id);
  const workflow = await services.workflow.getByPlayer(params.id);
  const rosterImpact = await services.rosterImpact.forPlayer(ORG_ID, detail.player);

  const { player: p, stats, measurements, film, transfers, previousSchools, similar, evaluations, fit } = detail;
  const latest = stats[0];
  const meas = measurements[0];
  const meta = POSITION_META[p.primaryPosition];

  const radar = [
    { label: "PROD", value: p.productionScore ?? 50 },
    { label: "ATHL", value: athleticism(meas) },
    { label: "SIZE", value: sizeScore(p) },
    { label: "PEDIGREE", value: Math.round(pedigreeScore(p.compositeRating)) },
    { label: "FIT", value: p.fitScore ?? 60 },
    { label: "ELIG", value: Math.round((p.eligibility.yearsRemaining / 4) * 100) },
  ];

  const metricEntries = Object.entries(latest?.metrics ?? {}).slice(0, 10);

  const measRows: [string, string | number | undefined][] = [
    ["Height", formatHeight(p.heightInches)],
    ["Weight", formatWeight(p.weightLbs)],
    ["40-yd", meas?.fortyYard ? `${meas.fortyYard}s` : undefined],
    ["Vertical", meas?.verticalInches ? `${meas.verticalInches}"` : undefined],
    ["Broad", meas?.broadJumpInches ? `${meas.broadJumpInches}"` : undefined],
    ["Arm", meas?.armLengthInches ? `${meas.armLengthInches}"` : undefined],
    ["Hand", meas?.handSizeInches ? `${meas.handSizeInches}"` : undefined],
    ["Bench", meas?.benchReps ? `${meas.benchReps}` : undefined],
    ["Shuttle", meas?.shuttle ? `${meas.shuttle}s` : undefined],
    ["3-Cone", meas?.threeCone ? `${meas.threeCone}s` : undefined],
  ];

  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-hairline bg-base px-6 py-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-32 h-72 w-[36rem] rounded-full opacity-25 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${POSITION_GROUP_HEX[meta.group]}, transparent)` }}
        />
        <Link href="/app/portal" className="relative mb-3 inline-flex items-center gap-1 text-[12px] text-ink-muted transition-colors hover:text-ink">
          <ChevronLeft size={14} /> Back to portal
        </Link>
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <PositionPill code={p.primaryPosition} />
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{p.fullName}</h1>
              {p.jerseyNumber && <span className="font-display text-xl text-ink-muted">#{p.jerseyNumber}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-sub">
              <span className="font-medium text-ink">{p.currentSchool.name}</span>
              <span className="text-ink-muted">{p.currentSchool.conference}</span>
              <span className="text-hairline-heavy">·</span>
              <span className="inline-flex items-center gap-1 text-ink-muted"><MapPin size={12} /> {p.hometown}</span>
              <span className="text-hairline-heavy">·</span>
              <span className="inline-flex items-center gap-1 text-ink-muted"><GraduationCap size={12} /> {p.eligibilityClass} · {meta.label}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PortalStatusBadge status={p.portalStatus} />
              <RecruitingStatusBadge status={p.recruitingStatus} />
              <TierBadge tier={p.consensusTier} />
              <StarRating stars={p.stars} />
              <span className="text-[12px] tnum text-ink-muted">{p.compositeRating.toFixed(4)} composite</span>
              {(p.undervaluation ?? 0) >= 20 && (
                <Badge tone="gold" dot>Undervalued +{p.undervaluation}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <FitDial score={p.fitScore} size={104} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Measurables + radar */}
          <Card>
            <CardHeader eyebrow="Combine & physical" title={<span className="inline-flex items-center gap-1.5"><Ruler size={14} /> Measurables</span>} />
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <div className="grid grid-cols-3 gap-3">
                {measRows.filter(([, v]) => v != null).map(([label, value]) => (
                  <Fact key={label} label={label} value={value} />
                ))}
              </div>
              <div className="flex items-center justify-center">
                <Radar data={radar} size={210} />
              </div>
            </div>
          </Card>

          {/* AI Scouting Report */}
          <ScoutingReportCard report={report} model={services.ai.model} />

          {/* Production */}
          <Card>
            <CardHeader
              eyebrow={latest ? `${latest.seasonYear} · ${latest.schoolName ?? p.currentSchool.name}` : "Production"}
              title={<span className="inline-flex items-center gap-1.5"><Activity size={14} /> Production</span>}
              action={latest ? <span className="text-[11px] text-ink-muted tnum">{latest.gamesPlayed} GP · {latest.gamesStarted ?? 0} GS · {latest.snaps ?? 0} snaps · {latest.pffOverall ?? "—"} PFF</span> : undefined}
            />
            <div className="space-y-3 p-4">
              {metricEntries.length > 0 && (
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-5">
                  {metricEntries.map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{humanize(k)}</div>
                      <div className="font-display text-[16px] font-semibold tnum text-ink">{fmt(v)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 border-t border-hairline pt-3">
                <PercentileBar label="Production pct" value={p.productionScore ?? 50} suffix="" />
                <PercentileBar label="Fit score" value={p.fitScore ?? 60} />
              </div>
            </div>
          </Card>

          {/* Transfer timeline */}
          <Card>
            <CardHeader eyebrow="Movement" title="Transfer History & Timeline" />
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                {previousSchools.map((s) => (
                  <span key={s.id} className="rounded bg-surface-2 px-2 py-1 text-ink-sub">{s.name}</span>
                ))}
                {previousSchools.length > 0 && <ArrowRight size={14} className="text-ink-muted" />}
                <span className="rounded-md bg-brand-500/15 px-2 py-1 font-medium text-brand-500 ring-1 ring-inset ring-brand-500/30">{p.currentSchool.name}</span>
              </div>
              <div className="divide-y divide-hairline">
                {transfers.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-2 text-[12.5px]">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-ink-sub">{t.windowType}</span>
                    <span className="text-ink-sub">Entered from <span className="font-medium text-ink">{t.fromSchoolName}</span></span>
                    <PortalStatusBadge status={t.status} />
                    {t.enrollmentTiming && <span className="text-[11px] text-ink-muted">{t.enrollmentTiming.replace("_", "-")}</span>}
                    <span className="ml-auto text-[11px] text-ink-muted">{longDate(t.enteredAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Film + Evaluations */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader eyebrow="Evaluation tape" title={<span className="inline-flex items-center gap-1.5"><Film size={14} /> Film</span>} />
              <div className="divide-y divide-hairline">
                {film.map((f) => (
                  <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">{f.type.replace("_", "-")}</span>
                    <span className="truncate text-[13px] text-ink-sub">{f.title}</span>
                  </a>
                ))}
                {film.length === 0 && (
                  <div className="space-y-2 px-4 py-3">
                    <div className="text-[11px] text-ink-muted">No film linked yet — pull tape:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "YouTube", href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${p.fullName} ${p.primaryPosition} highlights`)}` },
                        { label: "Hudl", href: `https://www.hudl.com/search/all?q=${encodeURIComponent(p.fullName)}` },
                        { label: "Google", href: `https://www.google.com/search?q=${encodeURIComponent(`${p.fullName} ${p.currentSchool.name} football highlights`)}` },
                      ].map((s) => (
                        <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="rounded bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-sub hover:bg-surface-3 hover:text-ink">
                          {s.label} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader eyebrow="Staff grades" title="Evaluations" />
              <div className="divide-y divide-hairline">
                {evaluations.map((e) => (
                  <div key={e.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-ink">{e.evaluatorName}</span>
                      <span className="font-display text-[15px] font-bold tnum text-amber-400">{e.numericGrade ?? "—"}</span>
                    </div>
                    <div className="text-[11px] text-ink-muted">{e.evaluatorRole.replace(/_/g, " ")} · {e.stage} · {e.confidence} conf.</div>
                  </div>
                ))}
                {evaluations.length === 0 && <div className="px-4 py-4 text-[12px] text-ink-muted">No staff evaluations yet.</div>}
              </div>
            </Card>
          </div>
        </div>

        {/* Decision rail */}
        <div className="space-y-6">
          <WorkflowPanel playerId={p.id} initial={workflow} />
          {rosterImpact && <RosterImpactCard impact={rosterImpact} />}
          <Card>
            <div className="space-y-3 p-4">
              <AddToBoardButton playerId={p.id} />
              <Link href="/app/board" className="block w-full rounded-lg border border-hairline-strong bg-surface-2 px-3 py-2 text-center text-[13px] font-medium text-ink-sub transition-colors hover:bg-surface-3 hover:text-ink">
                Open Recruiting Board
              </Link>
              <div className="border-t border-hairline pt-3">
                <AvailabilityControl playerId={p.id} current={p.portalStatus} source={p.statusSource} note={p.statusNote} />
              </div>
            </div>
          </Card>

          {fit && (
            <Card>
              <CardHeader eyebrow="Why this score" title={`Fit Breakdown · ${fit.total}`} />
              <div className="space-y-2.5 p-4">
                {fit.components.map((c) => (
                  <div key={c.key}>
                    <div className="mb-0.5 flex justify-between text-[11px] text-ink-muted">
                      <span>{c.label}</span>
                      <span>{Math.round(c.weight * 100)}% weight</span>
                    </div>
                    <PercentileBar label="" value={c.value} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader eyebrow="Eligibility engine" title="Eligibility" />
            <div className="grid grid-cols-2 gap-3 p-4">
              <Fact label="Years Left" value={p.eligibility.yearsRemaining} />
              <Fact label="Class" value={p.eligibilityClass} />
              <Fact label="Seasons Used" value={p.eligibility.seasonsUsed} />
              <Fact label="Redshirt" value={p.eligibility.redshirtUsed ? "Yes" : "No"} />
              <Fact label="Grad" value={p.eligibility.isGraduate ? "Yes" : "No"} />
              <Fact label="Scholarship" value={p.scholarshipStatus.replace(/_/g, " ").toLowerCase()} />
            </div>
          </Card>

          {(p.injuryFlags.length > 0 || p.characterFlags.length > 0) && (
            <Card>
              <CardHeader eyebrow="Risk" title={<span className="inline-flex items-center gap-1.5 text-sem-danger"><AlertTriangle size={14} /> Flags</span>} />
              <div className="space-y-1.5 p-4 text-[12.5px] text-ink-sub">
                {[...p.injuryFlags, ...p.characterFlags].map((f) => (
                  <div key={f} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-sem-danger" /> {f}</div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader eyebrow="Comparable profiles" title={<span className="inline-flex items-center gap-1.5"><Users size={14} /> Similar Players</span>} />
            <div className="divide-y divide-hairline">
              {similar.map((s) => (
                <Link key={s.id} href={`/players/${s.id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2">
                  <PositionPill code={s.primaryPosition} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{s.fullName}</span>
                  <span className="text-[11px] text-ink-muted">{s.currentSchool.name}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
