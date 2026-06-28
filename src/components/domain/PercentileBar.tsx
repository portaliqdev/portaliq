import { cn } from "@/lib/utils";
import { fitBand } from "./meta";

export function PercentileBar({
  label,
  value,
  suffix,
  colorByBand = true,
  className,
}: {
  label: string;
  value: number; // 0-100
  suffix?: string;
  colorByBand?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const hex = colorByBand ? fitBand(value).hex : "#2563eb";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="w-28 shrink-0 truncate text-[12px] text-ink-sub">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: hex }} />
      </div>
      <span className="w-10 shrink-0 text-right text-[12px] font-semibold tnum text-ink">
        {Math.round(value)}
        {suffix}
      </span>
    </div>
  );
}
