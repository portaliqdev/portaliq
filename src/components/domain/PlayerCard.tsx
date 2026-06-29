import Link from "next/link";
import type { Player } from "@/types/player";
import { PositionPill } from "./PositionPill";
import { StarRating } from "./StarRating";
import { FitScoreBadge } from "./FitScore";
import { PortalStatusBadge } from "./StatusBadge";
import { WorkflowStatusBadge } from "./WorkflowBadge";
import { formatHeight, formatWeight } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import type { RecruitingStatus } from "@/types/recruiting-workflow";

/**
 * Compact player card. Essentials (name, position, school, fit, stars, years,
 * status) read in under two seconds; measurables are progressively disclosed on
 * hover with a reserved-height row so the grid never reflows (no CLS).
 */
export function PlayerCard({ player: p, workflowStatus }: { player: Player; workflowStatus?: RecruitingStatus }) {
  const undervalued = (p.undervaluation ?? 0) >= 20;
  return (
    <Link
      href={`/app/players/${p.id}`}
      className="group relative block overflow-hidden rounded-xl bg-surface-1 p-3.5 shadow-card edge-highlight transition-[transform,box-shadow] duration-[var(--duration-base)] ease-out hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* hover sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent opacity-0 transition-opacity duration-[var(--duration-base)] group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <PositionPill code={p.primaryPosition} />
          <span className="truncate font-display text-[15px] font-semibold tracking-tight text-ink transition-colors group-hover:text-brand-500">
            {p.fullName}
          </span>
        </div>
        <FitScoreBadge score={p.fitScore} />
      </div>

      {/* School — measurables swap in on hover, same row height (no reflow) */}
      <div className="relative mt-1.5 h-[18px] text-[12px] text-ink-muted">
        <span className="absolute inset-0 truncate transition-opacity duration-[var(--duration-base)] group-hover:opacity-0">
          {p.currentSchool.name} <span className="text-ink-disabled">· {p.currentSchool.conference}</span>
        </span>
        <span className="absolute inset-0 truncate tnum text-ink-sub opacity-0 transition-opacity duration-[var(--duration-base)] group-hover:opacity-100">
          {formatHeight(p.heightInches)} · {formatWeight(p.weightLbs)} · {p.currentSchool.conference}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <StarRating stars={p.stars} />
        <div className="flex items-center gap-2 text-[11.5px] text-ink-sub">
          {undervalued && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-amber-400">
              <TrendingUp size={12} /> +{p.undervaluation}
            </span>
          )}
          <span className="tnum">{p.eligibility.yearsRemaining}y</span>
          {workflowStatus ? (
            <WorkflowStatusBadge status={workflowStatus} />
          ) : (
            <PortalStatusBadge status={p.portalStatus} />
          )}
        </div>
      </div>
    </Link>
  );
}
