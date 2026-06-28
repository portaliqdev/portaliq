"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex h-full w-[232px] shrink-0 bg-surface-1">
      {/* Signature accent rail — a single thin brand-blue rail framing the edge */}
      <div className="w-[3px] shrink-0 bg-brand-600" aria-hidden />

      <div className="flex flex-1 flex-col border-r border-hairline px-3 py-4">
        {/* Logo lockup */}
        <div className="flex items-center gap-2.5 px-1.5 pb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white shadow-sm">
            <Radar size={18} />
          </span>
          <span className="font-display text-[20px] font-bold tracking-[0.01em] text-ink">
            Portal<span className="text-brand-600">IQ</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV_ITEMS.map((item, i) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const showDivider = i > 0 && NAV_ITEMS[i - 1].section !== item.section;
            const Icon = item.icon;
            return (
              <div key={item.href}>
                {showDivider && <div className="mx-2 my-1.5 h-px bg-hairline" />}
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-sub hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <Icon
                    size={17}
                    className={cn(
                      "shrink-0",
                      active ? "text-brand-600" : "text-ink-muted group-hover:text-ink-sub",
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.count != null && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10px] font-bold tnum",
                        active
                          ? "bg-brand-100 text-brand-700"
                          : "bg-surface-2 text-ink-muted",
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
        <div className="mt-3 rounded-lg border border-hairline bg-surface-2 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sem-target" />
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.06em] text-ink">
              Winter Window
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-ink-muted">
            Day 12 · <span className="font-bold text-sem-risk">4 days left</span> · 23 today
          </div>
        </div>

        {/* Env badge */}
        <div className="mt-2 flex items-center justify-between px-1">
          <span className="eyebrow">
            {process.env.NEXT_PUBLIC_DATA_BACKEND === "postgres" ? "Live Data" : "Phase 1"}
          </span>
          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
            {process.env.NEXT_PUBLIC_DATA_BACKEND === "postgres" ? "CFBD · NEON" : "MOCK DATA"}
          </span>
        </div>
      </div>
    </aside>
  );
}
