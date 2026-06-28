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
  NEEDS_REVIEW: "#64748b",
  EVALUATING: "#7c3aed",
  CONTACTED: "#0891b2",
  MUTUAL_INTEREST: "#b45309",
  VISIT_SCHEDULED: "#0d9488",
  OFFER_EXTENDED: "#2563eb",
  COMMITTED: "#15803d",
  LOST: "#94a3b8",
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
        "group rounded-md border border-hairline bg-surface-2 p-2.5",
        draggable && "cursor-grab active:cursor-grabbing",
        pending && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {draggable && <GripVertical size={13} className="shrink-0 text-ink-muted" />}
          <PositionPill code={s.primaryPosition} size="sm" />
          <Link href={`/players/${entry.playerId}`} className="truncate text-[13px] font-semibold text-ink hover:text-md-red">
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
          className="rounded border border-hairline bg-surface-1 px-1 py-0.5 text-[11px] text-ink focus:outline-none focus:ring-1 focus:ring-md-red"
          title="Set priority"
        >
          <option value="" disabled>Priority</option>
          {PRIORITY_DESC.map((p) => (
            <option key={p} value={p}>{WORKFLOW_PRIORITY_META[p].label}</option>
          ))}
        </select>

        <button
          type="button"
          disabled={pending}
          onClick={assignMe}
          title={meta?.ownerName ? `Owner: ${meta.ownerName} — click to toggle` : "Assign to me"}
          className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium",
            meta?.ownerName
              ? "border-md-red/30 bg-md-red/10 text-md-red"
              : "border-hairline bg-surface-1 text-ink-sub hover:text-ink",
          )}
        >
          <UserPlus size={11} /> {meta?.ownerName ? meta.ownerName.split(" ")[0] : "Me"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => setNoteOpen((o) => !o)}
          title="Add note"
          className="inline-flex items-center gap-1 rounded border border-hairline bg-surface-1 px-1.5 py-0.5 text-[11px] font-medium text-ink-sub hover:text-ink"
        >
          {saved ? <Check size={11} className="text-sem-success" /> : <MessageSquarePlus size={11} />} Note
        </button>

        {entry.flags.length > 0 && (
          <span className="ml-auto rounded bg-surface-3 px-1 text-[10px] text-ink-muted">{entry.flags[0]}</span>
        )}
      </div>

      {noteOpen && (
        <div className="mt-1.5 space-y-1" onDragStart={stopDrag}>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quick note…"
            className="w-full rounded border border-hairline bg-surface-1 px-2 py-1 text-[12px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-md-red"
          />
          <button
            type="button"
            disabled={pending || !note.trim()}
            onClick={saveNote}
            className="w-full rounded bg-md-red px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-base px-6 py-4">
        <div>
          <div className="eyebrow mb-1">Recruiting Board · {view.board.seasonYear} {view.board.windowType}</div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-ink">{view.board.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Position filter */}
          <div className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface-1 px-2 py-1">
            <Filter size={13} className="text-ink-muted" />
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="bg-transparent text-[12px] font-medium text-ink focus:outline-none"
            >
              <option value="ALL">All positions</option>
              {positions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {/* Group-by toggle */}
          <div className="flex items-center rounded-md border border-hairline bg-surface-1 p-0.5">
            <ToggleBtn active={groupBy === "STAGE"} onClick={() => setGroupBy("STAGE")} icon={<Columns3 size={13} />} label="Stage" />
            <ToggleBtn active={groupBy === "POSITION"} onClick={() => setGroupBy("POSITION")} icon={<LayoutGrid size={13} />} label="Position" />
          </div>
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
                  "flex w-[260px] shrink-0 flex-col rounded-md border bg-surface-1",
                  hoverStage === col.stage ? "border-md-red" : "border-hairline",
                )}
              >
                <div className="flex items-center justify-between border-b border-hairline px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_HEX[col.stage] }} />
                    <span className="font-display text-[12px] font-semibold uppercase tracking-wide text-ink">{col.label}</span>
                  </div>
                  <span className="rounded bg-surface-3 px-1.5 text-[11px] font-semibold tnum text-ink-muted">
                    {positionFilter === "ALL" ? col.count : visible.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {visible.map((e) => (
                    <Card key={e.id} entry={e} meta={meta[e.playerId]} draggable onDragStart={setDragId} onMeta={onMeta} />
                  ))}
                  {visible.length === 0 && (
                    <div className="rounded-md border border-dashed border-hairline px-3 py-6 text-center text-[11px] text-ink-muted">
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
            <div key={col.position} className="flex w-[260px] shrink-0 flex-col rounded-md border border-hairline bg-surface-1">
              <div className="flex items-center justify-between border-b border-hairline px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <PositionPill code={col.position as never} size="sm" />
                  <span className="font-display text-[12px] font-semibold uppercase tracking-wide text-ink">{col.position} Room</span>
                </div>
                <span className="rounded bg-surface-3 px-1.5 text-[11px] font-semibold tnum text-ink-muted">{col.entries.length}</span>
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

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium",
        active ? "bg-md-red text-white" : "text-ink-sub hover:text-ink",
      )}
    >
      {icon} {label}
    </button>
  );
}
