import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { RosterImpact, ProjectedRole } from "@/services";
import { ArrowRight, Layers, TrendingUp, Check } from "lucide-react";

const ROLE_META: Record<ProjectedRole, { label: string; tone: "success" | "info" | "neutral" }> = {
  DAY_1_STARTER: { label: "Day-1 Starter", tone: "success" },
  ROTATION: { label: "Rotation Contributor", tone: "info" },
  DEPTH: { label: "Depth Option", tone: "neutral" },
};

function netTone(net: number): "success" | "gold" | "neutral" {
  if (net >= 5) return "success";
  if (net >= 1) return "gold";
  return "neutral";
}

/** Full Roster Impact card for the player profile decision rail. */
export function RosterImpactCard({ impact }: { impact: RosterImpact }) {
  const role = ROLE_META[impact.role];
  const sign = impact.net > 0 ? "+" : "";
  return (
    <Card>
      <CardHeader
        eyebrow="Roster construction"
        title={
          <span className="inline-flex items-center gap-1.5">
            <Layers size={14} className="text-md-gold" /> Roster Impact
          </span>
        }
        action={<Badge tone={role.tone} dot>{role.label}</Badge>}
      />
      <div className="space-y-3 p-4">
        {/* Before → after room score */}
        <div className="flex items-center justify-between rounded-md border border-hairline bg-surface-2 px-4 py-3">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">{impact.position} Room</div>
            <div className="font-display text-3xl font-bold tnum text-ink-sub">{impact.currentRoom}</div>
            <div className="text-[10px] text-ink-muted">current</div>
          </div>
          <ArrowRight size={18} className="text-ink-muted" />
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">After adding</div>
            <div className="font-display text-3xl font-bold tnum text-ink">{impact.projectedRoom}</div>
            <div className="text-[10px] text-ink-muted">projected</div>
          </div>
          <Badge tone={netTone(impact.net)} className="text-[13px]">
            <TrendingUp size={13} /> {sign}{impact.net}
          </Badge>
        </div>

        {/* Reasoning */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Why</div>
          {impact.reasons.map((r) => (
            <div key={r} className="flex items-start gap-2 text-[12.5px] text-ink-sub">
              <Check size={13} className="mt-0.5 shrink-0 text-sem-success" /> {r}
            </div>
          ))}
        </div>

        <p className="border-t border-hairline pt-2.5 text-[11px] text-ink-muted">
          Projected on a {impact.candidateGrade}/100 contribution grade vs. the current {impact.position} rotation.
        </p>
      </div>
    </Card>
  );
}

/** Compact inline chip — for recommended-target rows on the Team Needs page. */
export function RosterImpactChip({ impact }: { impact: RosterImpact }) {
  const role = ROLE_META[impact.role];
  const sign = impact.net > 0 ? "+" : "";
  return (
    <span title={`${impact.position} room ${impact.currentRoom} → ${impact.projectedRoom} · ${role.label}`}>
      <Badge tone={netTone(impact.net)} className="whitespace-nowrap">
        {sign}{impact.net} room · {role.label}
      </Badge>
    </span>
  );
}
