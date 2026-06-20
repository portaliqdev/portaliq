"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex h-full w-[232px] shrink-0 flex-col border-r border-hairline bg-surface-1">
      {/* Maryland flag signature rail */}
      <div className="flag-rail absolute inset-y-0 left-0 w-[3px]" aria-hidden />

      {/* Logo lockup */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flag-rail h-9 w-9 rounded-md ring-1 ring-hairline-strong" aria-hidden />
        <div className="leading-tight">
          <div className="font-display text-[17px] font-bold tracking-wide text-ink">
            PORTAL<span className="text-md-red">IQ</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
            Moneyball · Maryland
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-hairline" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                    active
                      ? "bg-surface-3 text-ink"
                      : "text-ink-sub hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-md-red" />
                  )}
                  <Icon
                    size={18}
                    className={cn(
                      "shrink-0",
                      active ? "text-md-red" : "text-ink-muted group-hover:text-ink-sub",
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / env badge */}
      <div className="border-t border-hairline px-4 py-3">
        <div className="flex items-center justify-between">
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
