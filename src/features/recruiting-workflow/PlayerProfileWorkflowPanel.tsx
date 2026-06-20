"use client";

import {
  Activity,
  AlertCircle,
  CalendarClock,
  Check,
  ClipboardList,
  MessageSquarePlus,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn, initials, shortDate } from "@/lib/utils";
import { RecruitingStatus } from "@/types/recruiting-workflow";
import {
  useAddRecruitingNote,
  useAssignRecruitingOwner,
  useRecruitingOwners,
  useRecruitingWorkflow,
  useSetRecruitingNextAction,
  useUpdateRecruitingPriority,
  useUpdateRecruitingStatus,
} from "./hooks";
import {
  ACTIVITY_LABELS,
  NEXT_ACTION_LABELS,
  WORKFLOW_PRIORITY_META,
  WORKFLOW_STATUS_META,
} from "./meta";
import {
  NEXT_ACTION_TYPES,
  RECRUITING_PRIORITIES,
  type NextActionType,
  type RecruitingActivity,
  type RecruitingWorkflow,
} from "./types";
import {
  RecruitingPriorityBadge,
  RecruitingWorkflowBadge,
} from "./RecruitingWorkflowBadge";

const fieldClass =
  "h-9 w-full rounded-md border border-hairline-strong bg-surface-2 px-2.5 text-[12px] text-ink outline-none transition-colors hover:border-hairline-heavy focus:border-md-gold disabled:cursor-not-allowed disabled:opacity-50";
const textAreaClass =
  "w-full rounded-md border border-hairline-strong bg-surface-2 px-2.5 py-2 text-[12px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-muted hover:border-hairline-heavy focus:border-md-gold disabled:cursor-not-allowed disabled:opacity-50";

function toDateTimeLocal(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultDueAt() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return toDateTimeLocal(date.toISOString());
}

function mutationError(error: unknown) {
  return error instanceof Error ? error.message : "The workflow update failed.";
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="eyebrow mb-1.5 block">
      {children}
    </label>
  );
}

function NextActionEditor({
  playerId,
  workflow,
}: {
  playerId: string;
  workflow: RecruitingWorkflow;
}) {
  const mutation = useSetRecruitingNextAction();
  const [type, setType] = useState<NextActionType>("CALL");
  const [dueAt, setDueAt] = useState(
    toDateTimeLocal(workflow.nextActionAt) || defaultDueAt(),
  );
  const [summary, setSummary] = useState(workflow.nextAction ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!dueAt || !summary.trim()) return;
    mutation.mutate({
      playerId,
      type,
      dueAt: new Date(dueAt).toISOString(),
      summary,
    });
  }

  return (
    <form onSubmit={submit} className="border-t border-hairline pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Next move</div>
          <div className="mt-0.5 text-[13px] font-semibold text-ink">
            Keep the recruitment moving
          </div>
        </div>
        {workflow.nextActionAt && (
          <Badge
            tone={
              new Date(workflow.nextActionAt).getTime() < Date.now()
                ? "danger"
                : "contacted"
            }
          >
            Due {shortDate(workflow.nextActionAt)}
          </Badge>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-[0.9fr_1.1fr]">
        <div>
          <FieldLabel htmlFor={`workflow-action-${playerId}`}>Action</FieldLabel>
          <select
            id={`workflow-action-${playerId}`}
            value={type}
            onChange={(event) => setType(event.target.value as NextActionType)}
            className={fieldClass}
          >
            {NEXT_ACTION_TYPES.map((value) => (
              <option key={value} value={value}>
                {NEXT_ACTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor={`workflow-due-${playerId}`}>Due</FieldLabel>
          <input
            id={`workflow-due-${playerId}`}
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      <div className="mt-2">
        <FieldLabel htmlFor={`workflow-summary-${playerId}`}>Brief</FieldLabel>
        <div className="flex gap-2">
          <input
            id={`workflow-summary-${playerId}`}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Call family, confirm visit window…"
            className={fieldClass}
          />
          <Button
            type="submit"
            variant="gold"
            disabled={mutation.isPending || !dueAt || !summary.trim()}
          >
            {mutation.isPending ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Save
          </Button>
        </div>
      </div>
      {mutation.isError && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-sem-danger">
          <AlertCircle size={12} />
          {mutationError(mutation.error)}
        </p>
      )}
    </form>
  );
}

function Notes({
  playerId,
  workflow,
}: {
  playerId: string;
  workflow: RecruitingWorkflow;
}) {
  const mutation = useAddRecruitingNote();
  const [body, setBody] = useState("");
  const notes = workflow.activities.filter((item) => item.type === "NOTE");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    mutation.mutate(
      { playerId, body },
      { onSuccess: () => setBody("") },
    );
  }

  return (
    <div className="border-t border-hairline pt-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquarePlus size={15} className="text-md-gold" />
        <div>
          <div className="eyebrow">Staff notes</div>
          <div className="mt-0.5 text-[13px] font-semibold text-ink">
            Shared recruiting context
          </div>
        </div>
      </div>
      <form onSubmit={submit}>
        <textarea
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add intel, relationship context, or a handoff note…"
          className={textAreaClass}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[10.5px] text-ink-muted">
            {notes.length} {notes.length === 1 ? "note" : "notes"} logged
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={mutation.isPending || !body.trim()}
          >
            Add note
          </Button>
        </div>
      </form>
      {notes.length > 0 && (
        <div className="mt-3 space-y-2">
          {notes.slice(-3).reverse().map((note) => (
            <div
              key={note.id}
              className="rounded-md border border-hairline bg-surface-2 p-2.5"
            >
              <p className="text-[11.5px] leading-relaxed text-ink-sub">
                {note.detail}
              </p>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
                <span>{note.createdBy?.name ?? "Staff"}</span>
                <span>{shortDate(note.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityIcon({ kind }: { kind: RecruitingActivity["type"] }) {
  if (kind === "OWNER_CHANGE") return <UserRound size={12} />;
  if (kind === "SYSTEM") return <CalendarClock size={12} />;
  if (kind === "NOTE") return <MessageSquarePlus size={12} />;
  if (kind === "STATUS_CHANGE" || kind === "PRIORITY_CHANGE") {
    return <ClipboardList size={12} />;
  }
  return <Activity size={12} />;
}

function ActivityTimeline({ activity }: { activity: RecruitingActivity[] }) {
  return (
    <div className="border-t border-hairline pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="eyebrow">Activity</div>
          <div className="mt-0.5 text-[13px] font-semibold text-ink">
            Recruitment timeline
          </div>
        </div>
        <span className="tnum text-[10.5px] text-ink-muted">
          {activity.length} events
        </span>
      </div>

      {activity.length === 0 ? (
        <div className="rounded-md border border-dashed border-hairline px-3 py-5 text-center text-[11px] text-ink-muted">
          Workflow changes will appear here.
        </div>
      ) : (
        <ol className="space-y-0">
          {[...activity].reverse().slice(0, 10).map((item, index) => (
            <li key={item.id} className="relative flex gap-3 pb-3">
              {index < Math.min(activity.length, 10) - 1 && (
                <span className="absolute left-[13px] top-6 h-[calc(100%-12px)] w-px bg-hairline-strong" />
              )}
              <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline-strong bg-surface-2 text-ink-muted">
                <ActivityIcon kind={item.type} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-[11.5px] font-medium text-ink">
                    {item.title}
                  </p>
                  <time className="shrink-0 text-[10px] text-ink-muted">
                    {shortDate(item.createdAt)}
                  </time>
                </div>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-muted">
                  <span className="mr-1 uppercase tracking-wide">
                    {ACTIVITY_LABELS[item.type]}
                  </span>
                  {item.detail}
                  {item.createdBy && ` · ${item.createdBy.name}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function WorkflowPanelContent({
  playerId,
  workflow,
}: {
  playerId: string;
  workflow: RecruitingWorkflow;
}) {
  const owners = useRecruitingOwners();
  const statusMutation = useUpdateRecruitingStatus();
  const priorityMutation = useUpdateRecruitingPriority();
  const ownerMutation = useAssignRecruitingOwner();
  const controlsPending =
    statusMutation.isPending ||
    priorityMutation.isPending ||
    ownerMutation.isPending;
  const controlError =
    statusMutation.error ?? priorityMutation.error ?? ownerMutation.error;

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor={`workflow-status-${playerId}`}>Status</FieldLabel>
          <select
            id={`workflow-status-${playerId}`}
            value={workflow.status}
            disabled={controlsPending}
            onChange={(event) =>
              statusMutation.mutate({
                playerId,
                status: event.target.value as RecruitingStatus,
              })
            }
            className={fieldClass}
          >
            {RecruitingStatus.options.map((value) => (
              <option key={value} value={value}>
                {WORKFLOW_STATUS_META[value].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor={`workflow-priority-${playerId}`}>
            Priority
          </FieldLabel>
          <select
            id={`workflow-priority-${playerId}`}
            value={workflow.priority}
            disabled={controlsPending}
            onChange={(event) =>
              priorityMutation.mutate({
                playerId,
                priority: event.target.value as (typeof RECRUITING_PRIORITIES)[number],
              })
            }
            className={fieldClass}
          >
            {RECRUITING_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {WORKFLOW_PRIORITY_META[value].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor={`workflow-owner-${playerId}`}>Owner</FieldLabel>
          <select
            id={`workflow-owner-${playerId}`}
            value={workflow.owner?.id ?? ""}
            disabled={controlsPending || owners.isLoading}
            onChange={(event) =>
              ownerMutation.mutate({
                playerId,
                ownerId: event.target.value || null,
              })
            }
            className={fieldClass}
          >
            <option value="">Unassigned</option>
            {owners.data?.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {controlError && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-sem-danger">
          <AlertCircle size={12} />
          {mutationError(controlError)}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-md border border-hairline bg-surface-2/60 p-2.5 text-[11px] sm:grid-cols-4">
        <div>
          <div className="eyebrow">Owner</div>
          <div className="mt-1 flex items-center gap-1.5 truncate text-ink-sub">
            {workflow.owner ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[9px] font-bold text-ink">
                {initials(workflow.owner.name)}
              </span>
            ) : (
              <UserRound size={13} />
            )}
            <span className="truncate">
          {workflow.owner?.name ?? "Open"}
            </span>
          </div>
        </div>
        <div>
          <div className="eyebrow">Last touch</div>
          <div className="mt-1 truncate text-ink-sub">
            {workflow.lastContactAt
              ? shortDate(workflow.lastContactAt)
              : "Not logged"}
          </div>
        </div>
        <div>
          <div className="eyebrow">Visit</div>
          <div className="mt-1 truncate text-ink-sub">
            {workflow.visitAt
              ? shortDate(workflow.visitAt)
              : "Not scheduled"}
          </div>
        </div>
        <div>
          <div className="eyebrow">Offer</div>
          <div className="mt-1 truncate text-ink-sub">
            {workflow.offerStatus.replaceAll("_", " ").toLowerCase()}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <NextActionEditor
          key={`${workflow.nextActionAt ?? "new-action"}-${workflow.nextAction ?? ""}`}
          playerId={playerId}
          workflow={workflow}
        />
        <Notes playerId={playerId} workflow={workflow} />
        <ActivityTimeline activity={workflow.activities} />
      </div>
    </>
  );
}

export function PlayerProfileWorkflowPanel({
  playerId,
  initialData,
  className,
}: {
  playerId: string;
  initialData?: RecruitingWorkflow;
  className?: string;
}) {
  const workflow = useRecruitingWorkflow(playerId, { initialData });

  return (
    <Card className={className} as="section">
      <CardHeader
        eyebrow="War room"
        title="Recruiting Workflow"
        action={
          workflow.data ? (
            <div className="flex items-center gap-1.5">
              <RecruitingWorkflowBadge status={workflow.data.status} />
              <RecruitingPriorityBadge priority={workflow.data.priority} />
            </div>
          ) : undefined
        }
      />
      <CardBody>
        {workflow.isLoading && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="skeleton h-9 rounded-md" />
              ))}
            </div>
            <div className="skeleton h-24 rounded-md" />
            <div className="skeleton h-32 rounded-md" />
          </div>
        )}

        {workflow.isError && (
          <div className="rounded-md border border-sem-danger/30 bg-sem-danger/10 p-3 text-[12px] text-sem-danger">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle size={15} />
              Workflow unavailable
            </div>
            <p className="mt-1 text-[11px] leading-relaxed">
              {mutationError(workflow.error)}
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => void workflow.refetch()}
            >
              <RefreshCw size={13} />
              Retry
            </Button>
          </div>
        )}

        {workflow.data && (
          <WorkflowPanelContent playerId={playerId} workflow={workflow.data} />
        )}
      </CardBody>
    </Card>
  );
}
