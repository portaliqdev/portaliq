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

export function PlayerCard({ player: p, workflowStatus }: { player: Player; workflowStatus?: RecruitingStatus }) {
  const undervalued = (p.undervaluation ?? 0) >= 20;
  return (
    <Link
      href={`/app/players/${p.id}`}
      className="group relative block overflow-hidden rounded-lg border border-hairline bg-surface-1 p-3 shadow-card edge-highlight transition-[transform,border-color,box-shadow] duration-[var(--duration-base)] ease-out hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-md"
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

      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-muted">
        <span className="truncate">{p.currentSchool.name}</span>
        <span className="text-ink-disabled">·</span>
        <span className="shrink-0">{p.currentSchool.conference}</span>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-hairline pt-2 text-[12px]">
        <span className="tnum text-ink-sub">
          {formatHeight(p.heightInches)} · {formatWeight(p.weightLbs)}
        </span>
        <span className="tnum text-ink-sub">{p.eligibility.yearsRemaining} yr left</span>
        <StarRating stars={p.stars} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PortalStatusBadge status={p.portalStatus} />
        {workflowStatus && <WorkflowStatusBadge status={workflowStatus} />}
        <span className="grow" />
        {undervalued && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <TrendingUp size={12} /> +{p.undervaluation}
          </span>
        )}
      </div>
    </Link>
  );
}
