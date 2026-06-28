"use client";

import { Search, ChevronDown, Calendar, Building2, Clock, Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "@/lib/auth/client";

export function Topbar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name
    ? user.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "DP";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/portal?q=${encodeURIComponent(term)}`);
  }

  async function onSignOut() {
    await signOut();
    router.push("/auth/sign-in");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-hairline bg-surface-1/90 px-5 backdrop-blur">
      {/* Global search */}
      <form onSubmit={onSubmit} className="relative w-full max-w-md">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search portal, players, board…"
          className="h-[34px] w-full rounded-md border border-hairline bg-surface-2 pl-9 pr-16 text-[13px] text-ink placeholder:text-ink-muted focus:border-brand-500 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-hairline bg-surface-1 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted sm:block">
          ⌘K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2">
        {/* Org switcher */}
        <button className="hidden items-center gap-1.5 rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] font-semibold text-ink-sub hover:bg-surface-2 hover:text-ink sm:flex">
          <Building2 size={14} className="text-ink-muted" />
          <span>Maryland</span>
          <ChevronDown size={13} className="text-ink-muted" />
        </button>

        {/* Season selector */}
        <button className="hidden items-center gap-1.5 rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] font-semibold text-ink-sub hover:bg-surface-2 hover:text-ink md:flex">
          <Calendar size={14} className="text-ink-muted" />
          <span className="tnum">2026</span>
          <ChevronDown size={13} className="text-ink-muted" />
        </button>

        {/* Window countdown chip */}
        <div className="flex items-center gap-1.5 rounded-full border border-sem-risk/25 bg-sem-risk/10 px-2.5 py-1">
          <Clock size={13} className="text-sem-risk" />
          <span className="text-[12px] font-bold text-sem-risk">Winter · 4d</span>
        </div>

        {/* Notifications */}
        <button className="relative flex h-[34px] w-[34px] items-center justify-center rounded-md border border-hairline bg-surface-1 text-ink-sub hover:bg-surface-2">
          <Bell size={16} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sem-danger" />
        </button>

        {/* User + sign out (sign-out only shown when signed in) */}
        <div className="ml-1 flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface-2 text-[11px] font-bold text-ink-sub"
            title={user?.email ?? "Demo"}
          >
            {initials}
          </div>
          {user && (
            <button
              onClick={onSignOut}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
