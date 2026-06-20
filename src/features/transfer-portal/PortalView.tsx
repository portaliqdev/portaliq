"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Player, PlayerFilters, SortKey } from "@/types/player";
import type { PortalFacets } from "@/services";
import { applyPlayerFilters } from "@/lib/mock-data/query";
import { POSITION_GROUPS } from "@/types/enums";
import type { PositionGroup, Conference, PortalStatus } from "@/types/enums";
import { PlayerCard } from "@/components/domain/PlayerCard";
import type { RecruitingStatus } from "@/types/recruiting-workflow";
import { PositionPill } from "@/components/domain/PositionPill";
import { FitScoreBadge } from "@/components/domain/FitScore";
import { StarRating } from "@/components/domain/StarRating";
import { PortalStatusBadge } from "@/components/domain/StatusBadge";
import { cn, formatHeight, fmt } from "@/lib/utils";
import { Search, LayoutGrid, List, X, TrendingUp, SlidersHorizontal } from "lucide-react";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "fitScore", label: "Fit Score" },
  { key: "compositeRating", label: "Recruiting Rating" },
  { key: "productionScore", label: "Production" },
  { key: "undervaluation", label: "Undervaluation" },
  { key: "yearsRemaining", label: "Years Left" },
  { key: "enteredPortal", label: "Newest Entry" },
  { key: "lastName", label: "Name" },
];

const CONFERENCES: Conference[] = ["Big Ten", "SEC", "ACC", "Big 12", "American", "Mountain West", "Sun Belt", "MAC", "Conference USA", "Independent"];
const STATUSES: PortalStatus[] = ["IN_PORTAL", "COMMITTED", "WITHDRAWN", "ENROLLED"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded px-2 py-1 text-[12px] font-medium transition-colors",
        active
          ? "bg-md-red text-white"
          : "border border-hairline-strong bg-surface-2 text-ink-sub hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-hairline px-4 py-3">
      <div className="eyebrow mb-2">{title}</div>
      {children}
    </div>
  );
}

export function PortalView({
  players,
  facets,
  initialQuery = "",
  workflowStatus,
}: {
  players: Player[];
  facets: PortalFacets;
  initialQuery?: string;
  workflowStatus?: Record<string, RecruitingStatus>;
}) {
  const [q, setQ] = useState(initialQuery);
  const [groups, setGroups] = useState<Set<PositionGroup>>(new Set());
  const [confs, setConfs] = useState<Set<Conference>>(new Set());
  const [statuses, setStatuses] = useState<Set<PortalStatus>>(new Set(["IN_PORTAL"]));
  const [minYears, setMinYears] = useState(0);
  const [maxWeight, setMaxWeight] = useState<number | "">("");
  const [minWeight, setMinWeight] = useState<number | "">("");
  const [minStars, setMinStars] = useState(0);
  const [powerOnly, setPowerOnly] = useState(false);
  const [undervaluedOnly, setUndervaluedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("fitScore");
  const [view, setView] = useState<"grid" | "list">("grid");

  const toggle = <T,>(set: React.Dispatch<React.SetStateAction<Set<T>>>, v: T) =>
    set((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });

  const filters: PlayerFilters = useMemo(
    () => ({
      q: q || undefined,
      positionGroups: groups.size ? [...groups] : undefined,
      conferences: confs.size ? [...confs] : undefined,
      portalStatuses: statuses.size ? [...statuses] : undefined,
      minYearsRemaining: minYears || undefined,
      maxWeightLbs: maxWeight === "" ? undefined : maxWeight,
      minWeightLbs: minWeight === "" ? undefined : minWeight,
      minStars: minStars || undefined,
      powerOnly: powerOnly || undefined,
      undervaluedOnly: undervaluedOnly || undefined,
      sortBy,
      sortDir: sortBy === "lastName" ? "asc" : "desc",
    }),
    [q, groups, confs, statuses, minYears, maxWeight, minWeight, minStars, powerOnly, undervaluedOnly, sortBy],
  );

  const results = useMemo(() => applyPlayerFilters(players, filters), [players, filters]);

  const activeCount =
    groups.size + confs.size + (statuses.size !== 1 || !statuses.has("IN_PORTAL") ? statuses.size : 0) +
    (minYears ? 1 : 0) + (maxWeight !== "" ? 1 : 0) + (minWeight !== "" ? 1 : 0) +
    (minStars ? 1 : 0) + (powerOnly ? 1 : 0) + (undervaluedOnly ? 1 : 0);

  function reset() {
    setGroups(new Set());
    setConfs(new Set());
    setStatuses(new Set(["IN_PORTAL"]));
    setMinYears(0);
    setMaxWeight("");
    setMinWeight("");
    setMinStars(0);
    setPowerOnly(false);
    setUndervaluedOnly(false);
    setQ("");
  }

  return (
    <div className="flex h-full">
      {/* Filter rail */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-hairline bg-surface-1 md:block">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <span className="inline-flex items-center gap-1.5 font-display text-[13px] font-semibold uppercase tracking-wide text-ink">
            <SlidersHorizontal size={14} /> Filters
          </span>
          {activeCount > 0 && (
            <button onClick={reset} className="inline-flex items-center gap-1 text-[11px] text-md-red hover:underline">
              <X size={11} /> Clear ({activeCount})
            </button>
          )}
        </div>

        <Section title="Position Group">
          <div className="flex flex-wrap gap-1.5">
            {POSITION_GROUPS.map((g) => (
              <Chip key={g} active={groups.has(g)} onClick={() => toggle(setGroups, g)}>
                {g}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Conference">
          <div className="flex flex-wrap gap-1.5">
            {CONFERENCES.map((c) => (
              <Chip key={c} active={confs.has(c)} onClick={() => toggle(setConfs, c)}>
                {c}
              </Chip>
            ))}
          </div>
          <button
            onClick={() => setPowerOnly((v) => !v)}
            className={cn("mt-2 w-full rounded px-2 py-1.5 text-[12px] font-medium", powerOnly ? "bg-md-gold text-ink-inverse" : "border border-hairline-strong text-ink-sub")}
          >
            Power 4 only
          </button>
        </Section>

        <Section title="Portal Status">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Chip key={s} active={statuses.has(s)} onClick={() => toggle(setStatuses, s)}>
                {s.replace("_", " ")}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title={`Years Remaining ≥ ${minYears}`}>
          <input
            type="range"
            min={0}
            max={4}
            value={minYears}
            onChange={(e) => setMinYears(Number(e.target.value))}
            className="w-full accent-md-red"
          />
          <div className="mt-1 flex justify-between text-[10px] text-ink-muted">
            {[0, 1, 2, 3, 4].map((y) => (
              <span key={y}>{y}</span>
            ))}
          </div>
        </Section>

        <Section title="Weight (lb)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="min"
              value={minWeight}
              onChange={(e) => setMinWeight(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded border border-hairline-strong bg-base px-2 py-1 text-[12px] tnum"
            />
            <span className="text-ink-muted">–</span>
            <input
              type="number"
              placeholder="max"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded border border-hairline-strong bg-base px-2 py-1 text-[12px] tnum"
            />
          </div>
        </Section>

        <Section title="Recruiting Rating">
          <div className="flex flex-wrap gap-1.5">
            {[2, 3, 4, 5].map((s) => (
              <Chip key={s} active={minStars === s} onClick={() => setMinStars(minStars === s ? 0 : s)}>
                {s}★+
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Moneyball">
          <button
            onClick={() => setUndervaluedOnly((v) => !v)}
            className={cn("inline-flex w-full items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[12px] font-medium", undervaluedOnly ? "bg-md-gold text-ink-inverse" : "border border-hairline-strong text-ink-sub")}
          >
            <TrendingUp size={13} /> Undervalued only
          </button>
        </Section>
      </aside>

      {/* Results */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-hairline bg-base px-4 py-2.5">
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, school…"
              className="h-8 w-full rounded-md border border-hairline-strong bg-surface-1 pl-8 pr-3 text-[13px] focus:border-md-red focus:outline-none"
            />
          </div>
          <div className="text-[12px] text-ink-muted">
            <span className="font-semibold text-ink tnum">{fmt(results.length)}</span> of {fmt(players.length)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-[11px] text-ink-muted">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-8 rounded-md border border-hairline-strong bg-surface-1 px-2 text-[12px] focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <div className="flex overflow-hidden rounded-md border border-hairline-strong">
              <button onClick={() => setView("grid")} className={cn("px-2 py-1.5", view === "grid" ? "bg-surface-3 text-ink" : "text-ink-muted")}>
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => setView("list")} className={cn("px-2 py-1.5", view === "list" ? "bg-surface-3 text-ink" : "text-ink-muted")}>
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="font-display text-[15px] font-semibold text-ink">No entrants match these filters</p>
              <p className="text-[13px] text-ink-muted">Widen the conference, eligibility, or weight range.</p>
              <button onClick={reset} className="mt-2 text-[12px] text-md-red hover:underline">Clear filters</button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {results.slice(0, 120).map((p) => (
                <PlayerCard key={p.id} player={p} workflowStatus={workflowStatus?.[p.id]} />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-hairline">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-hairline bg-surface-1 text-left">
                    {["Pos", "Player", "School", "Conf", "Ht/Wt", "Yrs", "★", "Prod", "Fit"].map((h) => (
                      <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 200).map((p) => (
                    <tr key={p.id} className="border-b border-hairline hover:bg-surface-2">
                      <td className="px-3 py-1.5"><PositionPill code={p.primaryPosition} size="sm" /></td>
                      <td className="px-3 py-1.5">
                        <Link href={`/players/${p.id}`} className="font-medium text-ink hover:text-md-red">
                          {p.fullName}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-ink-sub">{p.currentSchool.name}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{p.currentSchool.conference}</td>
                      <td className="px-3 py-1.5 tnum text-ink-sub">{formatHeight(p.heightInches)} / {p.weightLbs || "—"}</td>
                      <td className="px-3 py-1.5 tnum text-ink-sub">{p.eligibility.yearsRemaining}</td>
                      <td className="px-3 py-1.5"><StarRating stars={p.stars} /></td>
                      <td className="px-3 py-1.5 tnum text-ink-sub">{p.productionScore ?? "—"}</td>
                      <td className="px-3 py-1.5"><FitScoreBadge score={p.fitScore} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
