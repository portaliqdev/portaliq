import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Lightweight CSS-only tooltip (hover + focus-within). For non-critical hints only —
 * critical info is never hidden behind hover. Wraps an interactive child.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-hairline-strong bg-surface-3 px-2 py-1 text-[11px] font-medium text-ink shadow-md",
          "opacity-0 transition-opacity duration-[var(--duration-fast)] ease-out group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
        )}
      >
        {label}
      </span>
    </span>
  );
}
