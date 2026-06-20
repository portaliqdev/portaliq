"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAvailabilityAction } from "@/app/_actions/availability";
import type { PortalStatus } from "@/types/player";
import { ShieldCheck } from "lucide-react";

const OPTIONS: { value: PortalStatus; label: string }[] = [
  { value: "IN_PORTAL", label: "Available" },
  { value: "COMMITTED", label: "Committed" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

/**
 * Staff availability override. Lets a coach correct the feed when CFBD is wrong
 * or stale (it lags real-world withdrawals/commitments). The choice persists as
 * STAFF_OVERRIDE and beats re-ingestion.
 */
export function AvailabilityControl({
  playerId,
  current,
  source,
  note,
}: {
  playerId: string;
  current?: PortalStatus;
  source?: string;
  note?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<PortalStatus | undefined>(current);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        <ShieldCheck size={13} /> Staff availability
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            disabled={pending}
            onClick={() =>
              start(async () => {
                setSelected(o.value);
                const r = await setAvailabilityAction(playerId, o.value);
                if (r.ok) router.refresh();
              })
            }
            className={`rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors ${
              selected === o.value
                ? "border-md-red bg-md-red/15 text-ink"
                : "border-hairline text-ink-sub hover:bg-surface-2"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-[10.5px] leading-snug text-ink-muted">
        {source === "STAFF_OVERRIDE"
          ? note ?? "Set by staff — overrides the data feed."
          : source === "ROSTER_CHECK"
            ? note ?? "Derived from official roster cross-check."
            : "From CFBD portal feed. Override if you know it's stale."}
      </p>
    </div>
  );
}
