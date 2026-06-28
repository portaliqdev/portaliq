import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone =
  | "neutral"
  | "red"
  | "gold"
  | "success"
  | "commit"
  | "target"
  | "contacted"
  | "evaluating"
  | "watching"
  | "offer"
  | "risk"
  | "danger"
  | "lost"
  | "info";

/* Dark-tuned: translucent tinted fill + luminous text + hairline ring. */
const TONES: Record<Tone, string> = {
  neutral: "bg-white/[0.05] text-ink-sub ring-hairline-strong",
  red: "bg-brand-500/15 text-brand-500 ring-brand-500/30",
  gold: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  success: "bg-sem-success/15 text-sem-success ring-sem-success/30",
  commit: "bg-sem-commit/15 text-sem-commit ring-sem-commit/30",
  target: "bg-sem-target/15 text-sem-target ring-sem-target/30",
  contacted: "bg-sem-contacted/15 text-sem-contacted ring-sem-contacted/30",
  evaluating: "bg-sem-evaluating/15 text-sem-evaluating ring-sem-evaluating/30",
  watching: "bg-sem-watching/15 text-sem-watching ring-sem-watching/30",
  offer: "bg-sem-offer/15 text-sem-offer ring-sem-offer/30",
  risk: "bg-sem-risk/15 text-sem-risk ring-sem-risk/30",
  danger: "bg-sem-danger/15 text-sem-danger ring-sem-danger/30",
  lost: "bg-sem-lost/15 text-sem-lost ring-sem-lost/30",
  info: "bg-sem-info/15 text-sem-info ring-sem-info/30",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />}
      {children}
    </span>
  );
}
