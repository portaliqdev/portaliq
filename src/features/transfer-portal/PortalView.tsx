"use client";

import { useEffect, useMemo, useState } from "react";
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
import { AvailabilityIndicator } from "@/components/domain/StatusBadge";
import { Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
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
        "whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-[var(--duration-fast)]",
        active
          ? "bg-brand-500 text-[#08090c]"
          : "bg-white/[0.04] text-ink-sub hover:bg-white/[0.08] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/[0.05] px-5 py-4 last:border-0">
      <div className="eyebrow mb-2.5">{title}</div>
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

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

  // Filters surfaced inside the drawer (the quick chips live in the toolbar).
  const drawerCount =
    confs.size +
    (statuses.size !== 1 || !statuses.has("IN_PORTAL") ? statuses.size : 0) +
    (minYears ? 1 : 0) +
    (maxWeight !== "" ? 1 : 0) +
    (minWeight !== "" ? 1 : 0) +
    (minStars ? 1 : 0);

  const activeCount = drawerCount + groups.size + (powerOnly ? 1 : 0) + (undervaluedOnly ? 1 : 0);

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
    <div className="flex h-full min-w-0 flex-col">
      {/* Toolbar */}
      <div className="glass sticky top-0 z-20 space-y-2.5 border-b border-hairline px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, school…"
              className="h-9 w-full rounded-lg bg-surface-2 pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted focus:bg-surface-3 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
          </div>
          <div className="hidden text-[12px] text-ink-muted sm:block">
            <span className="font-semibold text-ink tnum">{fmt(results.length)}</span> of {fmt(players.length)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort by"
              className="h-9 rounded-lg bg-surface-2 px-2.5 text-[12px] text-ink hover:bg-surface-3 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key} className="bg-surface-1">
                  {o.label}
                </option>
              ))}
            </select>
            <SegmentedControl
              value={view}
              onChange={setView}
              segments={[
                { value: "grid", icon: <LayoutGrid size={14} />, title: "Grid" },
                { value: "list", icon: <List size={14} />, title: "List" },
              ]}
            />
            <button
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-colors",
                drawerCount > 0
                  ? "bg-brand-500/15 text-brand-500"
                  : "bg-surface-2 text-ink-sub hover:bg-surface-3 hover:text-ink",
              )}
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Filters</span>
              {drawerCount > 0 && <span className="tnum">{drawerCount}</span>}
            </button>
          </div>
        </div>

        {/* Quick filters — the high-frequency controls, calm and inline */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {POSITION_GROUPS.map((g) => (
            <Chip key={g} active={groups.has(g)} onClick={() => toggle(setGroups, g)}>
              {g}
            </Chip>
          ))}
          <span className="mx-0.5 h-5 w-px shrink-0 bg-hairline" />
          <button
            onClick={() => setUndervaluedOnly((v) => !v)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
              undervaluedOnly ? "bg-amber-500 text-[#1a1205]" : "bg-white/[0.04] text-ink-sub hover:bg-white/[0.08] hover:text-ink",
            )}
          >
            <TrendingUp size={12} /> Undervalued
          </button>
          <Chip active={powerOnly} onClick={() => setPowerOnly((v) => !v)}>
            Power 4
          </Chip>
          {activeCount > 0 && (
            <button
              onClick={reset}
              className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap pl-2 text-[11px] text-brand-500 hover:text-brand-400"
            >
              <X size={11} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {results.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="font-display text-[16px] font-semibold text-ink">No entrants match these filters</p>
            <p className="text-[13px] text-ink-muted">Widen the conference, eligibility, or weight range.</p>
            <button onClick={reset} className="mt-2 text-[12px] text-brand-500 hover:text-brand-400">
              Clear filters
            </button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {results.slice(0, 120).map((p) => (
              <PlayerCard key={p.id} player={p} workflowStatus={workflowStatus?.[p.id]} />
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <THead>
                {["Pos", "Player", "School", "Conf", "Ht/Wt", "Yrs", "★", "Prod", "Fit"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </THead>
              <TBody>
                {results.slice(0, 200).map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <PositionPill code={p.primaryPosition} size="sm" />
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <Link href={`/app/players/${p.id}`} className="font-medium text-ink hover:text-brand-500">
                          {p.fullName}
                        </Link>
                        <AvailabilityIndicator
                          source={p.statusSource}
                          reviewState={p.statusReviewState}
                          available={p.portalStatus === "IN_PORTAL"}
                          attentionOnly
                        />
                      </span>
                    </Td>
                    <Td className="text-ink-sub">{p.currentSchool.name}</Td>
                    <Td className="text-ink-muted">{p.currentSchool.conference}</Td>
                    <Td className="tnum text-ink-sub">
                      {formatHeight(p.heightInches)} / {p.weightLbs || "—"}
                    </Td>
                    <Td className="tnum text-ink-sub">{p.eligibility.yearsRemaining}</Td>
                    <Td>
                      <StarRating stars={p.stars} />
                    </Td>
                    <Td className="tnum text-ink-sub">{p.productionScore ?? "—"}</Td>
                    <Td>
                      <FitScoreBadge score={p.fitScore} size="sm" />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Filter drawer */}
      <div
        className={cn("fixed inset-0 z-40", drawerOpen ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={cn(
            "absolute inset-0 bg-[rgba(4,5,8,0.6)] transition-opacity duration-[var(--duration-base)]",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "absolute right-0 top-0 flex h-full w-[340px] max-w-[88vw] flex-col bg-surface-1 shadow-pop transition-transform duration-[var(--duration-base)]",
            drawerOpen ? "translate-x-0" : "translate-x-full",
          )}
          style={{ transitionTimingFunction: "var(--ease-out)" }}
        >
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <span className="inline-flex items-center gap-1.5 font-display text-[14px] font-semibold tracking-tight text-ink">
              <SlidersHorizontal size={15} className="text-ink-muted" /> Filters
            </span>
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <button onClick={reset} className="text-[11px] text-brand-500 hover:text-brand-400">
                  Clear ({activeCount})
                </button>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-2 hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <DrawerSection title="Conference">
              <div className="flex flex-wrap gap-1.5">
                {CONFERENCES.map((c) => (
                  <Chip key={c} active={confs.has(c)} onClick={() => toggle(setConfs, c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title="Portal Status">
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <Chip key={s} active={statuses.has(s)} onClick={() => toggle(setStatuses, s)}>
                    {s.replace("_", " ")}
                  </Chip>
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title={`Years Remaining ≥ ${minYears}`}>
              <input
                type="range"
                min={0}
                max={4}
                value={minYears}
                onChange={(e) => setMinYears(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="mt-1 flex justify-between text-[10px] tnum text-ink-muted">
                {[0, 1, 2, 3, 4].map((y) => (
                  <span key={y}>{y}</span>
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title="Weight (lb)">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="min"
                  value={minWeight}
                  onChange={(e) => setMinWeight(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-md bg-surface-3 px-2.5 py-1.5 text-[12px] tnum text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
                <span className="text-ink-muted">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="max"
                  value={maxWeight}
                  onChange={(e) => setMaxWeight(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-md bg-surface-3 px-2.5 py-1.5 text-[12px] tnum text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
              </div>
            </DrawerSection>

            <DrawerSection title="Recruiting Rating">
              <div className="flex flex-wrap gap-1.5">
                {[2, 3, 4, 5].map((s) => (
                  <Chip key={s} active={minStars === s} onClick={() => setMinStars(minStars === s ? 0 : s)}>
                    {s}★+
                  </Chip>
                ))}
              </div>
            </DrawerSection>
          </div>

          <div className="border-t border-hairline p-4">
            <button
              onClick={() => setDrawerOpen(false)}
              className="h-10 w-full rounded-lg bg-brand-500 text-[13px] font-semibold text-[#08090c] transition-colors hover:bg-brand-400"
            >
              Show {fmt(results.length)} players
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
