"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setAvailabilityOverrideAction,
  clearAvailabilityOverrideAction,
} from "@/app/_actions/availability";
import type { AvailabilityView } from "@/services/availability.service";
import type { PortalStatus } from "@/types/player";
import {
  PortalStatusBadge,
  AvailabilityIndicator,
} from "@/components/domain/StatusBadge";
import { shortDate } from "@/lib/utils";
import { ShieldCheck, RotateCcw, Link as LinkIcon } from "lucide-react";

const OPTIONS: { value: PortalStatus; label: string }[] = [
  { value: "IN_PORTAL", label: "Available" },
  { value: "COMMITTED", label: "Committed" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "ENROLLED", label: "Enrolled" },
];

function humanize(s: PortalStatus): string {
  return s.replace(/_/g, " ").toLowerCase();
}

/**
 * Staff availability override. Surfaces the layered provenance (effective status,
 * source, raw CFBD value, last check) and lets a coach correct the feed when it's
 * wrong or stale. An override needs an explicit reason — the server rejects an
 * empty note, so submit stays disabled until one is given. Clearing an override
 * falls back to the strongest remaining source.
 */
export function AvailabilityControl({
  playerId,
  view,
}: {
  playerId: string;
  view: AvailabilityView;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<PortalStatus | undefined>(view.status);
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!status && note.trim().length > 0 && !pending;

  function submit() {
    if (!status || !note.trim()) return;
    setError(null);
    start(async () => {
      const r = await setAvailabilityOverrideAction(playerId, {
        status,
        note: note.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined,
      });
      if (r.ok) {
        setNote("");
        setEvidenceUrl("");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function clearOverride() {
    setError(null);
    start(async () => {
      const r = await clearAvailabilityOverrideAction(playerId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          <ShieldCheck size={13} /> Staff availability
        </div>
        <AvailabilityIndicator source={view.source} reviewState={view.reviewState} withLabel />
      </div>

      {/* Provenance — what the product currently treats as authoritative and why */}
      <div className="space-y-1.5 rounded-lg border border-hairline bg-surface-2/50 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          {view.status ? (
            <PortalStatusBadge status={view.status} />
          ) : (
            <span className="text-[11px] text-ink-muted">No portal signal</span>
          )}
          <span className="text-[10.5px] font-medium text-ink-sub">{view.sourceLabel}</span>
        </div>
        {view.rawDiffersFromEffective && view.rawStatus && (
          <div className="text-[10.5px] leading-snug text-ink-muted">
            CFBD feed still shows{" "}
            <span className="font-medium text-ink-sub">{humanize(view.rawStatus)}</span>
          </div>
        )}
        <p className="text-[10.5px] leading-snug text-ink-muted">{view.explanation}</p>
        {(view.lastVerifiedAt ?? view.sourceUpdatedAt) && (
          <div className="text-[10px] text-ink-disabled">
            {view.isVerified ? "Verified" : "Checked"} {shortDate(view.lastVerifiedAt ?? view.sourceUpdatedAt)}
          </div>
        )}
      </div>

      {/* Override editor */}
      <div className="grid grid-cols-2 gap-1.5">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={pending}
            onClick={() => setStatus(o.value)}
            className={`rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors ${
              status === o.value
                ? "border-md-red bg-md-red/15 text-ink"
                : "border-hairline text-ink-sub hover:bg-surface-2"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reason for override (required)"
        className="w-full rounded-md bg-surface-3 px-2.5 py-1.5 text-[12px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500/50"
      />
      <div className="relative">
        <LinkIcon size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="Source URL (optional)"
          className="w-full rounded-md bg-surface-3 py-1.5 pl-7 pr-2.5 text-[12px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500/50"
        />
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className="h-8 w-full rounded-md bg-brand-500 text-[12px] font-semibold text-[#08090c] transition-colors hover:bg-brand-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save override"}
      </button>

      {error && <p className="text-[10.5px] leading-snug text-sem-danger">{error}</p>}

      {view.isOverride && (
        <button
          type="button"
          disabled={pending}
          onClick={clearOverride}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-hairline px-2 py-1.5 text-[11px] font-medium text-ink-sub transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
        >
          <RotateCcw size={12} /> Clear override · return to source status
        </button>
      )}
    </div>
  );
}
