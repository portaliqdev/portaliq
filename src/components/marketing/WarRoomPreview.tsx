"use client";

import { CountUp } from "@/components/ui/CountUp";
import { FitDial, FitScoreBadge } from "@/components/domain/FitScore";
import { PositionPill } from "@/components/domain/PositionPill";
import type { PositionCode } from "@/types/enums";

const ENTRANTS: { pos: PositionCode; name: string; school: string; fit: number }[] = [
  { pos: "EDGE" as PositionCode, name: "Marcus Vance", school: "Oregon", fit: 92 },
  { pos: "WR" as PositionCode, name: "Donte Riggs", school: "Ole Miss", fit: 88 },
  { pos: "CB" as PositionCode, name: "Theo Acker", school: "Kansas St.", fit: 81 },
];

function Bar({ label, pct, hex }: { label: string; pct: number; hex: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] text-ink-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div className="bar-grow h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: hex, boxShadow: `0 0 8px ${hex}66` }} />
      </div>
    </div>
  );
}

/** Stylized, in-motion replica of the product surface for the landing hero. */
export function WarRoomPreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-hairline-strong bg-surface-1 shadow-pop edge-highlight">
      {/* chrome */}
      <div className="flex items-center justify-between border-b border-hairline bg-surface-2 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sem-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sem-success" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-sub">War Room · 2026 Cycle</span>
        </div>
        <span className="rounded-full border border-sem-risk/30 bg-sem-risk/10 px-2 py-0.5 text-[10px] font-semibold text-sem-risk">
          Winter · 4d
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Portal", value: 312, accent: true },
            { label: "Board", value: 87, accent: false },
            { label: "Needs", value: 6, accent: false },
            { label: "Undervalued", value: 41, accent: false },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border border-hairline bg-surface-2 px-2.5 py-2">
              <div className="text-[9px] uppercase tracking-[0.1em] text-ink-muted">{k.label}</div>
              <div className={`font-display text-[18px] font-bold tnum ${k.accent ? "text-brand-500" : "text-ink"}`}>
                <CountUp value={k.value} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {/* Entrants list */}
          <div className="rounded-lg border border-hairline bg-surface-2 p-2.5 sm:col-span-3">
            <div className="mb-2 text-[9px] uppercase tracking-[0.12em] text-ink-muted">Newest Entrants</div>
            <div className="space-y-1.5">
              {ENTRANTS.map((e) => (
                <div key={e.name} className="flex items-center gap-2 rounded-md bg-surface-1 px-2 py-1.5">
                  <PositionPill code={e.pos} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{e.name}</span>
                  <span className="hidden text-[10px] text-ink-muted sm:block">{e.school}</span>
                  <FitScoreBadge score={e.fit} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Fit + bars */}
          <div className="flex flex-col items-center gap-3 rounded-lg border border-hairline bg-surface-2 p-2.5 sm:col-span-2">
            <FitDial score={92} size={84} />
            <div className="w-full space-y-1.5">
              <Bar label="Production" pct={88} hex="#34d399" />
              <Bar label="Scheme" pct={76} hex="#5b8def" />
              <Bar label="Pedigree" pct={64} hex="#fbbf24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
