"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Radar, X, Search } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/utils";

/**
 * Slide-in primary navigation for < md. Below the breakpoint the desktop sidebar
 * is hidden, so this is the only way to browse between sections — it must mirror
 * NAV_ITEMS exactly and stay reachable from every page.
 */
export function MobileNav({
  open,
  onClose,
  onSearch,
}: {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      className={cn("fixed inset-0 z-[100] md:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-[rgba(4,5,8,0.66)] transition-opacity duration-[var(--duration-base)]",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Drawer */}
      <nav
        aria-label="Main navigation"
        className={cn(
          "absolute left-0 top-0 flex h-full w-[280px] max-w-[82vw] flex-col bg-surface-1 shadow-pop transition-transform duration-[var(--duration-base)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <div className="flex items-center justify-between px-4 py-3.5">
          <Link href="/app" onClick={onClose} className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-[#08090c] shadow-glow">
              <Radar size={18} strokeWidth={2.4} />
            </span>
            <span className="font-display text-[18px] font-bold tracking-tight text-ink">
              Portal<span className="text-brand-500">IQ</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={() => {
            onClose();
            onSearch();
          }}
          className="mx-3 mb-2 flex h-11 items-center gap-2.5 rounded-lg bg-surface-2 px-3 text-left text-[13px] text-ink-muted hover:bg-surface-3"
        >
          <Search size={15} className="shrink-0" />
          <span className="flex-1 truncate">Search players, pages…</span>
          <Kbd>⌘K</Kbd>
        </button>

        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[14px] transition-colors",
                  active ? "bg-white/[0.05] font-medium text-ink" : "text-ink-sub hover:bg-white/[0.03] hover:text-ink",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-full bg-brand-500" />
                )}
                <Icon
                  size={18}
                  strokeWidth={2}
                  className={cn("shrink-0", active ? "text-brand-500" : "text-ink-muted")}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.count != null && (
                  <span
                    className={cn(
                      "tnum text-[12px] font-medium",
                      active ? "text-brand-500" : "text-ink-disabled",
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
