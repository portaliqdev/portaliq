"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative hidden h-full w-[236px] shrink-0 flex-col border-r border-hairline bg-surface-1 md:flex">
      <div className="flex flex-1 flex-col px-3 py-4">
        {/* Logo lockup */}
        <Link href="/app" className="group mb-5 flex items-center gap-2.5 px-1.5">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-[#08090c] shadow-glow">
            <Radar size={18} strokeWidth={2.4} />
          </span>
          <span className="font-display text-[19px] font-bold tracking-tight text-ink">
            Portal<span className="text-brand-500">IQ</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV_ITEMS.map((item, i) => {
            const active =
              item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            const showDivider = i > 0 && NAV_ITEMS[i - 1].section !== item.section;
            const Icon = item.icon;
            return (
              <div key={item.href}>
                {showDivider && <div className="mx-2 my-2 h-px bg-hairline" />}
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-[var(--duration-fast)]",
                    active
                      ? "bg-brand-500/10 text-ink"
                      : "text-ink-sub hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand-500 shadow-glow" />
                  )}
                  <Icon
                    size={17}
                    strokeWidth={2.1}
                    className={cn(
                      "shrink-0 transition-colors",
                      active ? "text-brand-500" : "text-ink-muted group-hover:text-ink-sub",
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.count != null && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10px] font-semibold tnum",
                        active ? "bg-brand-500/20 text-brand-500" : "bg-surface-3 text-ink-muted",
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Portal-window status widget */}
        <div className="mt-3 overflow-hidden rounded-lg border border-hairline bg-surface-2 px-3 py-2.5 edge-highlight">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sem-risk opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sem-risk" />
            </span>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-sub">
              Winter Window
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-ink-muted">
            Day 12 · <span className="font-semibold text-sem-risk">4 days left</span> · 23 today
          </div>
        </div>

        {/* Env badge */}
        <div className="mt-2 flex items-center justify-between px-1">
          <span className="eyebrow">
            {process.env.NEXT_PUBLIC_DATA_BACKEND === "postgres" ? "Live Data" : "Phase 1"}
          </span>
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-muted">
            {process.env.NEXT_PUBLIC_DATA_BACKEND === "postgres" ? "CFBD · NEON" : "MOCK DATA"}
          </span>
        </div>
      </div>
    </aside>
  );
}
