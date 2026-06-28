"use client";

import { Search, Calendar, Building2, Clock, Bell, LogOut, Menu, Radar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "@/lib/auth/client";
import { COMMAND_EVENT } from "@/components/ui/CommandPalette";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/utils";

function openCommand() {
  window.dispatchEvent(new Event(COMMAND_EVENT));
}

export function Topbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "DP";

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function onSignOut() {
    await signOut();
    router.push("/auth/sign-in");
  }

  return (
    <header className="glass sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-4 sm:px-5">
      {/* Mobile: menu + logo */}
      <button
        onClick={openCommand}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-2 hover:text-ink md:hidden"
      >
        <Menu size={18} />
      </button>
      <Link href="/app" className="flex items-center gap-2 md:hidden">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-[#08090c]">
          <Radar size={15} strokeWidth={2.4} />
        </span>
      </Link>

      {/* Command trigger (acts like a search field) */}
      <button
        onClick={openCommand}
        className="group hidden h-[34px] w-full max-w-md items-center gap-2.5 rounded-lg border border-hairline bg-surface-2 pl-3 pr-2 text-left text-[13px] text-ink-muted transition-colors hover:border-hairline-strong hover:bg-surface-3 sm:flex"
      >
        <Search size={15} className="shrink-0" />
        <span className="flex-1 truncate">Search players, jump to a page…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Org context */}
        <div className="hidden items-center gap-1.5 rounded-lg border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] font-semibold text-ink-sub lg:flex">
          <Building2 size={14} className="text-ink-muted" />
          <span>Maryland</span>
        </div>

        {/* Season context */}
        <div className="hidden items-center gap-1.5 rounded-lg border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] font-semibold text-ink-sub md:flex">
          <Calendar size={14} className="text-ink-muted" />
          <span className="tnum">2026</span>
        </div>

        {/* Window countdown chip */}
        <div className="flex items-center gap-1.5 rounded-full border border-sem-risk/30 bg-sem-risk/10 px-2.5 py-1">
          <Clock size={13} className="text-sem-risk" />
          <span className="text-[12px] font-semibold text-sem-risk">Winter · 4d</span>
        </div>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-hairline bg-surface-1 text-ink-sub transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Bell size={16} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sem-danger shadow-[0_0_6px_var(--sem-danger)]" />
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline-strong bg-surface-2 text-[11px] font-bold text-ink-sub transition-colors hover:border-brand-500/50 hover:text-ink"
            title={user?.email ?? "Demo"}
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-lg border border-hairline-strong bg-surface-1 shadow-pop animate-scale-in">
              <div className="border-b border-hairline px-3 py-2.5">
                <div className="truncate text-[13px] font-semibold text-ink">{user?.name ?? "Demo Coach"}</div>
                <div className="truncate text-[11px] text-ink-muted">{user?.email ?? "demo@portaliq.app"}</div>
              </div>
              {user ? (
                <button
                  onClick={onSignOut}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-ink-sub transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <LogOut size={15} /> Sign out
                </button>
              ) : (
                <Link
                  href="/auth/sign-in"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-ink-sub transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <LogOut size={15} /> Sign in
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
