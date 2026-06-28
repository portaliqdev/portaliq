"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface Segment<T extends string> {
  value: T;
  label?: string;
  icon?: ReactNode;
  title?: string;
}

/**
 * Compact segmented toggle (grid/list, group-by, etc). Animated active pill via
 * an absolutely-positioned highlight is avoided for simplicity; instead the active
 * segment gets a raised surface — crisp and dependency-free.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  size = "md",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  segments: Segment<T>[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-hairline bg-surface-2 p-0.5",
        className,
      )}
    >
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <button
            key={seg.value}
            role="tab"
            aria-selected={active}
            title={seg.title ?? seg.label}
            onClick={() => onChange(seg.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-[background-color,color,box-shadow] duration-[var(--duration-fast)] ease-out",
              size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[12px]",
              active
                ? "bg-surface-3 text-ink shadow-sm edge-highlight"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {seg.icon}
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
