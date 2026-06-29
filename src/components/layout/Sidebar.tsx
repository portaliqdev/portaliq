"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative hidden h-full w-[228px] shrink-0 flex-col border-r border-hairline bg-surface-1/50 md:flex">
      <div className="flex flex-1 flex-col px-3 py-4">
        {/* Logo lockup */}
        <Link href="/app" className="mb-6 flex items-center gap-2.5 px-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-[#08090c] shadow-glow">
            <Radar size={18} strokeWidth={2.4} />
          </span>
          <span className="font-display text-[18px] font-bold tracking-tight text-ink">
            Portal<span className="text-brand-500">IQ</span>
          </span>
        </Link>

        {/* Nav — calm: hierarchy carried by the active rail + spacing, not dividers */}
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "bg-white/[0.045] font-medium text-ink"
                    : "text-ink-sub hover:bg-white/[0.03] hover:text-ink",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-brand-500" />
                )}
                <Icon
                  size={16.5}
                  strokeWidth={2}
                  className={cn(
                    "shrink-0 transition-colors",
                    active ? "text-brand-500" : "text-ink-muted group-hover:text-ink-sub",
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.count != null && (
                  <span
                    className={cn(
                      "tnum text-[11px] font-medium tabular-nums",
                      active ? "text-brand-500" : "text-ink-disabled",
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Portal-window status — compact, quiet */}
        <div className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sem-risk opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sem-risk" />
            </span>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-sub">
              Winter Window
            </span>
          </div>
          <div className="mt-1 text-[11px] text-ink-muted">
            Day 12 · <span className="font-semibold text-sem-risk">4 days left</span>
          </div>
        </div>

        {/* Env badge */}
        <div className="mt-2 flex items-center justify-between px-1.5">
          <span className="eyebrow">
            {process.env.NEXT_PUBLIC_DATA_BACKEND === "postgres" ? "Live Data" : "Phase 1"}
          </span>
          <span className="font-mono text-[10px] font-medium text-ink-disabled">
            {process.env.NEXT_PUBLIC_DATA_BACKEND === "postgres" ? "CFBD · NEON" : "MOCK"}
          </span>
        </div>
      </div>
    </aside>
  );
}
