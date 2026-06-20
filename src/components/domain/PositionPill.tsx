import { cn } from "@/lib/utils";
import { POSITION_META, POSITION_GROUP_HEX } from "@/types/enums";
import type { PositionCode } from "@/types/enums";

export function PositionPill({
  code,
  className,
  size = "md",
}: {
  code: PositionCode;
  className?: string;
  size?: "sm" | "md";
}) {
  const hex = POSITION_GROUP_HEX[POSITION_META[code].group];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded font-bold uppercase tracking-wide",
        size === "sm" ? "h-5 min-w-[2rem] px-1 text-[10px]" : "h-6 min-w-[2.25rem] px-1.5 text-[11px]",
        className,
      )}
      style={{ color: hex, backgroundColor: `${hex}22`, boxShadow: `inset 0 0 0 1px ${hex}44` }}
      title={POSITION_META[code].label}
    >
      {code}
    </span>
  );
}
