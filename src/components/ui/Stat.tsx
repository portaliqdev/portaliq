import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { CountUp } from "./CountUp";

/**
 * KPI tile. Numeric values count up on mount unless `countUp={false}`. Replaces the
 * duplicated StatCard / Kpi helpers previously inlined on the dashboard and needs pages.
 */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
  className,
  format,
  countUp = true,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** Tints the value + adds a faint brand wash for hero metrics. */
  accent?: boolean;
  className?: string;
  format?: (n: number) => string;
  countUp?: boolean;
}) {
  const isNum = typeof value === "number";
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-hairline bg-surface-1 px-4 py-3 shadow-card edge-highlight",
        "transition-colors duration-[var(--duration-base)] ease-out hover:border-hairline-strong",
        className,
      )}
    >
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-brand-500/20 blur-2xl"
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="eyebrow">{label}</div>
        {Icon && <Icon size={14} className="text-ink-muted" />}
      </div>
      <div
        className={cn(
          "mt-1.5 font-display text-stat-xl font-bold tnum",
          accent ? "text-brand-500" : "text-ink",
        )}
      >
        {isNum && countUp ? (
          <CountUp value={value as number} format={format} />
        ) : (
          value
        )}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-muted">{hint}</div>}
    </div>
  );
}
