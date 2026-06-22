"use client";

import { Search, ChevronDown, Calendar, LogOut } from "lucide-react";
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
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-4 border-b border-hairline bg-surface-1 px-5">
      {/* Global search */}
      <form onSubmit={onSubmit} className="relative w-full max-w-md">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search players, schools, positions…"
          className="h-9 w-full rounded-md border border-hairline-strong bg-base pl-9 pr-16 text-[13px] text-ink placeholder:text-ink-muted focus:border-md-red focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-hairline-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted sm:block">
          ⌘K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2">
        {/* Season selector */}
        <button className="flex items-center gap-1.5 rounded-md border border-hairline-strong bg-base px-2.5 py-1.5 text-[12.5px] text-ink-sub hover:text-ink">
          <Calendar size={14} className="text-ink-muted" />
          <span className="tnum font-medium">2026</span>
          <span className="text-ink-muted">Cycle</span>
          <ChevronDown size={13} className="text-ink-muted" />
        </button>

        {/* Org switcher */}
        <button className="flex items-center gap-2 rounded-md border border-hairline-strong bg-base px-2.5 py-1.5 text-[12.5px] hover:bg-surface-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-md-red text-[10px] font-bold text-white">
            MD
          </span>
          <span className="font-medium text-ink">Maryland</span>
          <ChevronDown size={13} className="text-ink-muted" />
        </button>

        {/* User + sign out (sign-out only shown when signed in) */}
        <div className="ml-1 flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold text-ink ring-1 ring-hairline-strong"
            title={user?.email ?? "Demo"}
          >
            {initials}
          </div>
          {user && (
            <button
              onClick={onSignOut}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline-strong text-ink-muted hover:text-ink"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
