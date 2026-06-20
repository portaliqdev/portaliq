"use client";

import { useState } from "react";
import Link from "next/link";
import type { BoardView } from "@/services";
import type { BoardEntry } from "@/types/board";
import type { BoardStage } from "@/types/enums";
import { PositionPill } from "@/components/domain/PositionPill";
import { FitScoreBadge } from "@/components/domain/FitScore";
import { StarRating } from "@/components/domain/StarRating";
import { WorkflowPriorityBadge } from "@/components/domain/WorkflowBadge";
import type { RecruitingPriority } from "@/types/recruiting-workflow";
import { moveBoardEntryAction } from "@/app/_actions/board";
import { cn } from "@/lib/utils";
import { GripVertical, AlertCircle } from "lucide-react";

const STAGE_HEX: Record<BoardStage, string> = {
  WATCHING: "#7C828C",
  EVALUATING: "#A78BFA",
  CONTACTED: "#38BDF8",
  PRIORITY: "#FFD520",
  OFFER_EXTENDED: "#E21833",
  COMMITTED: "#16A34A",
  LOST: "#6B7280",
};

function Card({
  entry,
  onDragStart,
  priority,
}: {
  entry: BoardEntry;
  onDragStart: (id: string) => void;
  priority?: RecruitingPriority;
}) {
  const s = entry.playerStamp;
  return (
    <Link
      href={`/players/${entry.playerId}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(entry.id);
      }}
      className="group block cursor-grab rounded-md border border-hairline bg-surface-2 p-2.5 active:cursor-grabbing hover:border-hairline-heavy"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <GripVertical size={13} className="shrink-0 text-ink-muted" />
          <PositionPill code={s.primaryPosition} size="sm" />
          <span className="truncate text-[13px] font-semibold text-ink">{s.fullName}</span>
        </div>
        <FitScoreBadge score={s.fitScore} size="sm" />
      </div>
      <div className="mt-1.5 flex items-center justify-between pl-[22px] text-[11px] text-ink-muted">
        <span className="truncate">{s.currentSchoolName}</span>
        <span className="tnum">{s.yearsRemaining} yr</span>
      </div>
      <div className="mt-1 flex items-center justify-between pl-[22px]">
        <StarRating stars={s.stars} />
        <span className="flex items-center gap-1">
          {priority && <WorkflowPriorityBadge priority={priority} />}
          {entry.flags.length > 0 && (
            <span className="rounded bg-surface-3 px-1 text-[10px] text-ink-muted">{entry.flags[0]}</span>
          )}
        </span>
      </div>
    </Link>
  );
}

export function BoardClient({ view, workflowPriority }: { view: BoardView; workflowPriority?: Record<string, RecruitingPriority> }) {
  const [columns, setColumns] = useState(view.columns);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<BoardStage | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setColumns(prev); // revert optimistic update
        setError(res.error ?? "Move not permitted.");
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-hairline bg-base px-6 py-4">
        <div>
          <div className="eyebrow mb-1">Recruiting Board · {view.board.seasonYear} {view.board.windowType}</div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-ink">{view.board.name}</h1>
        </div>
        <div className="text-[12px] text-ink-muted">
          <span className="font-semibold text-ink tnum">{view.board.entryCount ?? columns.reduce((s, c) => s + c.count, 0)}</span> prospects · drag to move
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-sem-danger/30 bg-sem-danger/10 px-6 py-2 text-[12px] text-sem-danger">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
        {columns.map((col) => (
          <div
            key={col.stage}
            onDragOver={(e) => {
              e.preventDefault();
              setHoverStage(col.stage);
            }}
            onDragLeave={() => setHoverStage((s) => (s === col.stage ? null : s))}
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
              <span className="rounded bg-surface-3 px-1.5 text-[11px] font-semibold tnum text-ink-muted">{col.count}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {col.entries.map((e) => (
                <Card key={e.id} entry={e} onDragStart={setDragId} priority={workflowPriority?.[e.playerId]} />
              ))}
              {col.entries.length === 0 && (
                <div className="rounded-md border border-dashed border-hairline px-3 py-6 text-center text-[11px] text-ink-muted">
                  Drop prospects here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
