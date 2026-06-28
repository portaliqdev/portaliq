"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { BoardView } from "@/services";
import type { BoardEntry } from "@/types/board";
import type { BoardStage } from "@/types/enums";
import type { RecruitingPriority } from "@/types/recruiting-workflow";
import { PositionPill } from "@/components/domain/PositionPill";
import { FitScoreBadge } from "@/components/domain/FitScore";
import { StarRating } from "@/components/domain/StarRating";
import { BoardStageBadge } from "@/components/domain/StatusBadge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { WORKFLOW_PRIORITY_META, WORKFLOW_PRIORITY_ORDER } from "@/lib/workflow-meta";
import {
  moveBoardEntryAction,
  setBoardPriorityAction,
  addBoardNoteAction,
  assignBoardOwnerToMeAction,
} from "@/app/_actions/board";
import { cn } from "@/lib/utils";
import { GripVertical, AlertCircle, MessageSquarePlus, UserPlus, Check, Filter, Columns3, LayoutGrid } from "lucide-react";

export interface BoardEntryMeta {
  priority: RecruitingPriority;
  ownerName: string | null;
}

const STAGE_HEX: Record<BoardStage, string> = {
  NEEDS_REVIEW: "#94a3b8",
  EVALUATING: "#a78bfa",
  CONTACTED: "#38bdf8",
  MUTUAL_INTEREST: "#f6b645",
  VISIT_SCHEDULED: "#2dd4bf",
  OFFER_EXTENDED: "#5b8def",
  COMMITTED: "#34d399",
  LOST: "#6b7280",
};

const PRIORITY_DESC = [...WORKFLOW_PRIORITY_ORDER].reverse(); // CRITICAL → LOW

type GroupBy = "STAGE" | "POSITION";

function pos(entry: BoardEntry): string {
  return entry.positionColumn || entry.playerStamp.primaryPosition;
}

function Card({
  entry,
  meta,
  draggable,
  showStage,
  onDragStart,
  onMeta,
}: {
  entry: BoardEntry;
  meta?: BoardEntryMeta;
  draggable: boolean;
  showStage?: boolean;
  onDragStart?: (id: string) => void;
  onMeta: (playerId: string, patch: Partial<BoardEntryMeta>) => void;
}) {
  const s = entry.playerStamp;
  const [pending, start] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stopDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  function setPriority(p: RecruitingPriority) {
    const prev = meta?.priority;
    onMeta(entry.playerId, { priority: p }); // optimistic
    start(async () => {
      const res = await setBoardPriorityAction(entry.playerId, p);
      if (!res.ok) {
        onMeta(entry.playerId, { priority: prev });
        setErr(res.error ?? "Failed");
      }
    });
  }

  function assignMe() {
    start(async () => {
      const res = await assignBoardOwnerToMeAction(entry.playerId);
      if (res.ok) onMeta(entry.playerId, { ownerName: res.ownerName });
      else setErr(res.error ?? "Failed");
    });
  }

  function saveNote() {
    const body = note.trim();
    if (!body) return;
    start(async () => {
      const res = await addBoardNoteAction(entry.playerId, body);
      if (res.ok) {
        setNote("");
        setNoteOpen(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } else {
        setErr(res.error ?? "Failed");
      }
    });
  }

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(entry.id);
      }}
      className={cn(
        "group rounded-lg border border-hairline bg-surface-2 p-2.5 shadow-card transition-[border-color,box-shadow,opacity] duration-[var(--duration-fast)] hover:border-hairline-strong",
        draggable && "cursor-grab active:cursor-grabbing active:opacity-80 active:shadow-glow",
        pending && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {draggable && <GripVertical size={13} className="shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />}
          <PositionPill code={s.primaryPosition} size="sm" />
          <Link href={`/app/players/${entry.playerId}`} className="truncate text-[13px] font-semibold text-ink hover:text-brand-500">
            {s.fullName}
          </Link>
        </div>
        <FitScoreBadge score={s.fitScore} size="sm" />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-muted">
        <span className="truncate">{s.currentSchoolName}</span>
        <span className="flex items-center gap-1.5">
          <StarRating stars={s.stars} />
          <span className="tnum">{s.yearsRemaining} yr</span>
        </span>
      </div>

      {showStage && (
        <div className="mt-1.5">
          <BoardStageBadge stage={entry.canonicalStage} />
        </div>
      )}

      {/* Inline actions */}
      <div
        className="mt-2 flex items-center gap-1.5 border-t border-hairline pt-2"
        onDragStart={stopDrag}
        draggable={false}
      >
        <select
          value={meta?.priority ?? ""}
          disabled={pending}
          onChange={(e) => setPriority(e.target.value as RecruitingPriority)}
          className="rounded-md border border-hairline bg-surface-3 px-1 py-0.5 text-[11px] text-ink focus:outline-none focus:ring-1 focus:ring-brand-500"
          title="Set priority"
        >
          <option value="" disabled>Priority</option>
          {PRIORITY_DESC.map((p) => (
            <option key={p} value={p} className="bg-surface-1">{WORKFLOW_PRIORITY_META[p].label}</option>
          ))}
        </select>

        <button
          type="button"
          disabled={pending}
          onClick={assignMe}
          title={meta?.ownerName ? `Owner: ${meta.ownerName} — click to toggle` : "Assign to me"}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors",
            meta?.ownerName
              ? "border-brand-500/40 bg-brand-500/15 text-brand-500"
              : "border-hairline bg-surface-3 text-ink-sub hover:text-ink",
          )}
        >
          <UserPlus size={11} /> {meta?.ownerName ? meta.ownerName.split(" ")[0] : "Me"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => setNoteOpen((o) => !o)}
          title="Add note"
          className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium text-ink-sub transition-colors hover:text-ink"
        >
          {saved ? <Check size={11} className="text-sem-success" /> : <MessageSquarePlus size={11} />} Note
        </button>

        {entry.flags.length > 0 && (
          <span className="ml-auto rounded bg-surface-3 px-1 text-[10px] text-ink-muted">{entry.flags[0]}</span>
        )}
      </div>

      {noteOpen && (
        <div className="mt-1.5 space-y-1.5 animate-scale-in" onDragStart={stopDrag}>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quick note…"
            className="w-full rounded-md border border-hairline bg-surface-3 px-2 py-1 text-[12px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            disabled={pending || !note.trim()}
            onClick={saveNote}
            className="w-full rounded-md bg-brand-500 px-2 py-1 text-[11px] font-semibold text-[#08090c] transition-colors hover:bg-brand-400 disabled:opacity-50"
          >
            Save note
          </button>
        </div>
      )}

      {err && <div className="mt-1 text-[10px] text-sem-danger">{err}</div>}
    </div>
  );
}

export function BoardClient({ view, workflowMeta }: { view: BoardView; workflowMeta?: Record<string, BoardEntryMeta> }) {
  const [columns, setColumns] = useState(view.columns);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<BoardStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, BoardEntryMeta>>(workflowMeta ?? {});
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [groupBy, setGroupBy] = useState<GroupBy>("STAGE");

  const onMeta = (playerId: string, patch: Partial<BoardEntryMeta>) =>
    setMeta((m) => ({ ...m, [playerId]: { priority: m[playerId]?.priority ?? "MEDIUM", ownerName: m[playerId]?.ownerName ?? null, ...patch } }));

  const allEntries = useMemo(() => columns.flatMap((c) => c.entries), [columns]);
  const positions = useMemo(
    () => [...new Set(allEntries.map(pos))].sort(),
    [allEntries],
  );
  const matches = (e: BoardEntry) => positionFilter === "ALL" || pos(e) === positionFilter;

  function handleDrop(targetStage: BoardStage) {
    setHoverStage(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const source = columns.find((c) => c.entries.some((e) => e.id === id));
    if (!source || source.stage === targetStage) return;
    const entry = source.entries.find((e) => e.id === id)!;

    const prev = columns;
    const next = columns.map((c) => {
      if (c.stage === source.stage) return { ...c, entries: c.entries.filter((e) => e.id !== id), count: c.count - 1 };
      if (c.stage === targetStage) {
        const moved: BoardEntry = { ...entry, canonicalStage: targetStage, rank: c.entries.length + 1 };
        return { ...c, entries: [...c.entries, moved], count: c.count + 1 };
      }
      return c;
    });
    setColumns(next);
    setError(null);

    const targetCol = next.find((c) => c.stage === targetStage)!;
    moveBoardEntryAction(id, targetStage, targetCol.entries.length).then((res) => {
      if (!res.ok) {
        setColumns(prev);
        setError(res.error ?? "Move not permitted.");
      }
    });
  }

  // Position-grouped columns (read-only — position isn't a workflow state).
  const positionColumns = useMemo(() => {
    const map = new Map<string, BoardEntry[]>();
    for (const e of allEntries) {
      if (!matches(e)) continue;
      const key = pos(e);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()]
      .map(([position, entries]) => ({ position, entries }))
      .sort((a, b) => b.entries.length - a.entries.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntries, positionFilter]);

  const total = view.board.entryCount ?? allEntries.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-base px-6 py-5">
        <div>
          <div className="eyebrow mb-1.5">Recruiting Board · {view.board.seasonYear} {view.board.windowType}</div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-ink">{view.board.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Position filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-1 px-2 py-1.5">
            <Filter size={13} className="text-ink-muted" />
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="bg-transparent text-[12px] font-medium text-ink focus:outline-none"
            >
              <option value="ALL" className="bg-surface-1">All positions</option>
              {positions.map((p) => (
                <option key={p} value={p} className="bg-surface-1">{p}</option>
              ))}
            </select>
          </div>
          {/* Group-by toggle */}
          <SegmentedControl
            value={groupBy}
            onChange={setGroupBy}
            segments={[
              { value: "STAGE", label: "Stage", icon: <Columns3 size={13} /> },
              { value: "POSITION", label: "Position", icon: <LayoutGrid size={13} /> },
            ]}
          />
          <div className="hidden text-[12px] text-ink-muted sm:block">
            <span className="font-semibold text-ink tnum">{total}</span> prospects
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-sem-danger/30 bg-sem-danger/10 px-6 py-2 text-[12px] text-sem-danger">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {groupBy === "STAGE" ? (
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
          {columns.map((col) => {
            const visible = col.entries.filter(matches);
            const isHover = hoverStage === col.stage;
            return (
              <div
                key={col.stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHoverStage(col.stage);
                }}
                onDragLeave={() => setHoverStage((st) => (st === col.stage ? null : st))}
                onDrop={() => handleDrop(col.stage)}
                className={cn(
                  "flex w-[268px] shrink-0 flex-col rounded-xl border bg-surface-1 transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
                  isHover ? "border-brand-500/60 shadow-glow" : "border-hairline",
                )}
              >
                <div className="flex items-center justify-between border-b border-hairline px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: STAGE_HEX[col.stage], boxShadow: `0 0 6px ${STAGE_HEX[col.stage]}` }}
                    />
                    <span className="font-display text-[12px] font-semibold uppercase tracking-wide text-ink">{col.label}</span>
                  </div>
                  <span className="rounded-md bg-surface-3 px-1.5 text-[11px] font-semibold tnum text-ink-muted">
                    {positionFilter === "ALL" ? col.count : visible.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {visible.map((e) => (
                    <Card key={e.id} entry={e} meta={meta[e.playerId]} draggable onDragStart={setDragId} onMeta={onMeta} />
                  ))}
                  {visible.length === 0 && (
                    <div className={cn(
                      "rounded-lg border border-dashed px-3 py-6 text-center text-[11px] transition-colors",
                      isHover ? "border-brand-500/50 text-brand-500" : "border-hairline text-ink-muted",
                    )}>
                      {positionFilter === "ALL" ? "Drop prospects here" : "None at this position"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
          {positionColumns.map((col) => (
            <div key={col.position} className="flex w-[268px] shrink-0 flex-col rounded-xl border border-hairline bg-surface-1">
              <div className="flex items-center justify-between border-b border-hairline px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <PositionPill code={col.position as never} size="sm" />
                  <span className="font-display text-[12px] font-semibold uppercase tracking-wide text-ink">{col.position} Room</span>
                </div>
                <span className="rounded-md bg-surface-3 px-1.5 text-[11px] font-semibold tnum text-ink-muted">{col.entries.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {col.entries.map((e) => (
                  <Card key={e.id} entry={e} meta={meta[e.playerId]} draggable={false} showStage onMeta={onMeta} />
                ))}
              </div>
            </div>
          ))}
          {positionColumns.length === 0 && (
            <div className="m-auto text-[12px] text-ink-muted">No prospects match this filter.</div>
          )}
        </div>
      )}
    </div>
  );
}
