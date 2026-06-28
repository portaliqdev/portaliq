"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Radar,
  Columns3,
  Target,
  FileText,
  Sparkles,
  Settings,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "./Kbd";
import { PositionPill } from "@/components/domain/PositionPill";
import type { PositionCode } from "@/types/enums";

/** Fire `window.dispatchEvent(new Event("portaliq:command"))` anywhere to open it. */
export const COMMAND_EVENT = "portaliq:command";

interface PageCmd {
  type: "page";
  label: string;
  href: string;
  icon: typeof Search;
  hint: string;
}
interface PlayerCmd {
  type: "player";
  id: string;
  name: string;
  position: PositionCode;
  school: string;
  fitScore: number | null;
}
type Cmd = PageCmd | PlayerCmd;

const PAGES: PageCmd[] = [
  { type: "page", label: "Dashboard", href: "/app", icon: LayoutDashboard, hint: "War room" },
  { type: "page", label: "Transfer Portal", href: "/app/portal", icon: Radar, hint: "Scouting" },
  { type: "page", label: "Recruiting Board", href: "/app/board", icon: Columns3, hint: "Pipeline" },
  { type: "page", label: "Team Needs", href: "/app/needs", icon: Target, hint: "Roster" },
  { type: "page", label: "Reports", href: "/app/reports", icon: FileText, hint: "Output" },
  { type: "page", label: "AI Assistant", href: "/app/assistant", icon: Sparkles, hint: "Intelligence" },
  { type: "page", label: "Settings", href: "/app/settings", icon: Settings, hint: "Admin" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<PlayerCmd[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setPlayers([]);
    setActive(0);
  }, []);

  // Global open: ⌘K / Ctrl+K + custom event from the topbar button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onCmd = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(COMMAND_EVENT, onCmd);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(COMMAND_EVENT, onCmd);
    };
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Debounced player search.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setPlayers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        setPlayers(data.players ?? []);
      } catch {
        /* aborted or failed — leave list as-is */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const pages = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return PAGES;
    return PAGES.filter((p) => p.label.toLowerCase().includes(term) || p.hint.toLowerCase().includes(term));
  }, [q]);

  const items: Cmd[] = useMemo(() => [...pages, ...players], [pages, players]);

  useEffect(() => {
    setActive(0);
  }, [q, players.length]);

  function run(cmd: Cmd) {
    close();
    if (cmd.type === "page") router.push(cmd.href);
    else router.push(`/app/players/${cmd.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) run(items[active]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center px-4 pt-[12vh] animate-fade-in"
      onMouseDown={close}
    >
      <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-hairline-strong bg-surface-1 shadow-pop animate-scale-in"
      >
        {/* Search row */}
        <div className="flex items-center gap-2.5 border-b border-hairline px-4">
          <Search size={17} className="shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players, jump to a page…"
            className="h-12 w-full bg-transparent text-[14px] text-ink placeholder:text-ink-muted focus:outline-none"
          />
          {loading && <Loader2 size={15} className="shrink-0 animate-spin text-ink-muted" />}
          <Kbd>Esc</Kbd>
        </div>

        {/* Results */}
        <div className="max-h-[52vh] overflow-y-auto py-2">
          {pages.length > 0 && (
            <Group label="Navigate">
              {pages.map((p, i) => (
                <Row key={p.href} active={active === i} onMouseEnter={() => setActive(i)} onClick={() => run(p)}>
                  <p.icon size={16} className="shrink-0 text-ink-muted" />
                  <span className="flex-1 text-[13.5px] text-ink">{p.label}</span>
                  <span className="text-[11px] text-ink-muted">{p.hint}</span>
                </Row>
              ))}
            </Group>
          )}

          {players.length > 0 && (
            <Group label="Players">
              {players.map((pl, i) => {
                const idx = pages.length + i;
                return (
                  <Row key={pl.id} active={active === idx} onMouseEnter={() => setActive(idx)} onClick={() => run(pl)}>
                    <PositionPill code={pl.position} size="sm" />
                    <span className="flex-1 truncate text-[13.5px] text-ink">{pl.name}</span>
                    <span className="truncate text-[11px] text-ink-muted">{pl.school}</span>
                    {pl.fitScore != null && (
                      <span className="tnum text-[12px] font-semibold text-brand-500">{pl.fitScore}</span>
                    )}
                  </Row>
                );
              })}
            </Group>
          )}

          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-ink-muted">
              {q.trim().length < 2 ? "Type to search the portal…" : "No matches."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-hairline bg-surface-2 px-4 py-2 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Kbd><ArrowUp size={9} /></Kbd>
            <Kbd><ArrowDown size={9} /></Kbd> navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd><CornerDownLeft size={9} /></Kbd> open
          </span>
          <span className="ml-auto font-mono">PortalIQ</span>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-2">
      <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({
  active,
  onClick,
  onMouseEnter,
  children,
}: {
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-75",
        active ? "bg-surface-3" : "hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
