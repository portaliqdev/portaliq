import { cn } from "@/lib/utils";
import { fitBand } from "./meta";

export function FitScoreBadge({
  score,
  size = "md",
  showLabel = false,
}: {
  score?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  if (score == null) {
    return <span className="text-ink-muted">—</span>;
  }
  const band = fitBand(score);
  const sizes = {
    sm: "h-6 min-w-[1.5rem] text-[12px] px-1",
    md: "h-7 min-w-[1.75rem] text-[13px] px-1.5",
    lg: "h-9 min-w-[2.25rem] text-[16px] px-2",
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md font-bold tnum tabular-nums",
          sizes[size],
        )}
        style={{
          color: band.hex,
          backgroundColor: `${band.hex}1c`,
          boxShadow: `inset 0 0 0 1px ${band.hex}40`,
        }}
      >
        {score}
      </span>
      {showLabel && <span className="text-[11px] font-medium text-ink-muted">{band.label}</span>}
    </span>
  );
}

/** Circular fit dial for the player profile hero — glowing progress arc. */
export function FitDial({ score, size = 96 }: { score?: number; size?: number }) {
  const value = score ?? 0;
  const band = fitBand(value);
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        aria-hidden
        className="absolute inset-2 rounded-full blur-xl"
        style={{ backgroundColor: `${band.hex}26` }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={band.hex}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ filter: `drop-shadow(0 0 6px ${band.hex}80)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-2xl font-bold tnum" style={{ color: band.hex }}>
          {score ?? "—"}
        </span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">Fit</span>
      </div>
    </div>
  );
}
