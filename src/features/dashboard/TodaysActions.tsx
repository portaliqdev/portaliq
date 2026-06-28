import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import type { ActionGroup, ActionTone } from "@/services";
import {
  ClipboardCheck,
  Clock,
  AlertTriangle,
  Hourglass,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

const TONE_HEX: Record<ActionTone, string> = {
  danger: "#f87171",
  risk: "#fbbf24",
  target: "#f6b645",
  info: "#5b8def",
};

const GROUP_ICON: Record<string, LucideIcon> = {
  review: ClipboardCheck,
  followups: Clock,
  uncovered: AlertTriangle,
  stuck: Hourglass,
  recs: Sparkles,
};

export function TodaysActions({ groups }: { groups: ActionGroup[] }) {
  return (
    <Card>
      <CardHeader
        eyebrow="Command center"
        title={
          <span className="inline-flex items-center gap-1.5">
            <ClipboardCheck size={15} className="text-brand-500" /> Today&apos;s Portal Actions
          </span>
        }
        action={
          groups.length > 0 ? (
            <span className="text-[12px] text-ink-muted">
              {groups.length} {groups.length === 1 ? "thing" : "things"} need attention
            </span>
          ) : undefined
        }
      />
      {groups.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-ink-sub">
          <CheckCircle2 size={16} className="text-sem-success" /> You&apos;re all caught up — nothing needs attention right now.
        </div>
      ) : (
        <div className="divide-y divide-hairline">
          {groups.map((g) => {
            const Icon = GROUP_ICON[g.id] ?? ClipboardCheck;
            const hex = TONE_HEX[g.tone];
            return (
              <div key={g.id} className="flex gap-3 px-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${hex}1f`, color: hex }}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[18px] font-bold tnum leading-none" style={{ color: hex }}>
                      {g.count}
                    </span>
                    <span className="text-[13.5px] font-semibold text-ink">{g.title}</span>
                    <Link
                      href={g.cta.href}
                      className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-brand-500 transition-colors hover:text-brand-400"
                    >
                      {g.cta.label} <ArrowRight size={12} />
                    </Link>
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-muted">{g.detail}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {g.items.map((it) => (
                      <Link
                        key={it.id}
                        href={it.href}
                        className="inline-flex items-center gap-1 rounded border border-hairline bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-sub hover:border-hairline-heavy hover:text-ink"
                      >
                        <span className="font-medium text-ink">{it.label}</span>
                        {it.sublabel && <span className="text-ink-muted">· {it.sublabel}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
