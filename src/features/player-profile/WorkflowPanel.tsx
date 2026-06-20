"use client";

import { useState } from "react";
import { useWorkflow, useWorkflowActions } from "@/hooks/use-workflow";
import { WorkflowStatusBadge, WorkflowPriorityBadge } from "@/components/domain/WorkflowBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { shortDate } from "@/lib/utils";
import {
  WORKFLOW_STATUS_META,
  WORKFLOW_PRIORITY_META,
  WORKFLOW_STATUS_ORDER,
  WORKFLOW_PRIORITY_ORDER,
} from "@/lib/workflow-meta";
import type { RecruitingPriority, RecruitingStatus, RecruitingWorkflow } from "@/types/recruiting-workflow";
import { Phone, MessageSquare, Mail, CalendarCheck, BadgeCheck, Workflow } from "lucide-react";

const selectCls =
  "w-full rounded-md border border-hairline bg-surface-2 px-2 py-1.5 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-md-red";

export function WorkflowPanel({ playerId, initial }: { playerId: string; initial: RecruitingWorkflow | null }) {
  const { data: workflow } = useWorkflow(playerId);
  const a = useWorkflowActions(playerId);
  const [note, setNote] = useState("");
  const wf = workflow ?? initial;
  const busy =
    a.setStatus.isPending || a.setPriority.isPending || a.assignOwner.isPending ||
    a.addNote.isPending || a.logContact.isPending || a.scheduleVisit.isPending || a.markOffer.isPending;

  if (!wf) {
    return (
      <Card>
        <CardHeader eyebrow="Recruiting" title="Workflow" />
        <div className="px-4 py-4 text-[12px] text-ink-muted">No workflow yet for this player.</div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Recruiting"
        title={<span className="inline-flex items-center gap-1.5"><Workflow size={14} className="text-md-gold" /> Workflow</span>}
      />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <WorkflowStatusBadge status={wf.status} />
          <WorkflowPriorityBadge priority={wf.priority} />
        </div>

        {/* Status + priority */}
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Status</span>
            <select
              className={selectCls}
              disabled={busy}
              value={wf.status}
              onChange={(e) => a.setStatus.mutate([e.target.value as RecruitingStatus])}
            >
              {WORKFLOW_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{WORKFLOW_STATUS_META[s].label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Priority</span>
            <select
              className={selectCls}
              disabled={busy}
              value={wf.priority}
              onChange={(e) => a.setPriority.mutate([e.target.value as RecruitingPriority])}
            >
              {WORKFLOW_PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>{WORKFLOW_PRIORITY_META[p].label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Owner + dates */}
        <div className="space-y-1.5 rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[12px]">
          <Row label="Owner">
            <span className="flex items-center gap-2">
              <span className="text-ink">{wf.owner?.name ?? "Unassigned"}</span>
              <button
                className="text-[11px] font-medium text-md-red hover:underline disabled:opacity-50"
                disabled={busy}
                onClick={() => a.assignOwner.mutate([!wf.owner])}
              >
                {wf.owner ? "Unassign" : "Assign to me"}
              </button>
            </span>
          </Row>
          <Row label="Last contact">{wf.lastContactAt ? shortDate(wf.lastContactAt) : "—"}</Row>
          <Row label="Next action">{wf.nextAction ? `${wf.nextAction}${wf.nextActionAt ? ` · ${shortDate(wf.nextActionAt)}` : ""}` : "—"}</Row>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-1.5">
          <QuickBtn icon={<Phone size={13} />} label="Call" disabled={busy} onClick={() => a.logContact.mutate(["CALL"])} />
          <QuickBtn icon={<MessageSquare size={13} />} label="Text" disabled={busy} onClick={() => a.logContact.mutate(["TEXT"])} />
          <QuickBtn icon={<Mail size={13} />} label="Email" disabled={busy} onClick={() => a.logContact.mutate(["EMAIL"])} />
          <QuickBtn
            icon={<CalendarCheck size={13} />} label="Visit" disabled={busy}
            onClick={() => a.scheduleVisit.mutate([new Date(Date.now() + 7 * 864e5).toISOString()])}
          />
          <QuickBtn icon={<BadgeCheck size={13} />} label="Offer" disabled={busy} onClick={() => a.markOffer.mutate([])} />
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <textarea
            className="w-full rounded-md border border-hairline bg-surface-2 px-2 py-1.5 text-[13px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-md-red"
            rows={2}
            placeholder="Add a note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !note.trim()}
            className="w-full"
            onClick={() => a.addNote.mutate([note], { onSuccess: () => setNote("") })}
          >
            Add Note
          </Button>
        </div>

        {/* Activity history */}
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Activity</div>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {[...wf.activities].reverse().map((act) => (
              <div key={act.id} className="border-l-2 border-hairline-strong pl-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-ink">{act.title}</span>
                  <span className="text-[10px] text-ink-muted">{shortDate(act.createdAt)}</span>
                </div>
                {(act.detail || act.note) && <div className="text-[11px] text-ink-muted">{act.detail ?? act.note}</div>}
                {act.actor?.name && <div className="text-[10px] text-ink-muted">by {act.actor.name}</div>}
              </div>
            ))}
            {wf.activities.length === 0 && <div className="text-[12px] text-ink-muted">No activity logged yet.</div>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink-sub">{children}</span>
    </div>
  );
}

function QuickBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center gap-1 rounded-md border border-hairline bg-surface-2 px-2 py-1.5 text-[11px] font-medium text-ink-sub hover:bg-surface-3 hover:text-ink disabled:opacity-50"
    >
      {icon} {label}
    </button>
  );
}
