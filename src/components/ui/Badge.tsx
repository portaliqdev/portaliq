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

/* Dark-tuned: calm translucent tinted fill + luminous text. Ring dropped to cut
   visual noise — the tint alone carries the semantic; severity reads via hue. */
const TONES: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-ink-sub",
  red: "bg-brand-500/12 text-brand-500",
  gold: "bg-amber-500/12 text-amber-400",
  success: "bg-sem-success/12 text-sem-success",
  commit: "bg-sem-commit/12 text-sem-commit",
  target: "bg-sem-target/12 text-sem-target",
  contacted: "bg-sem-contacted/12 text-sem-contacted",
  evaluating: "bg-sem-evaluating/12 text-sem-evaluating",
  watching: "bg-sem-watching/12 text-sem-watching",
  offer: "bg-sem-offer/12 text-sem-offer",
  risk: "bg-sem-risk/12 text-sem-risk",
  danger: "bg-sem-danger/12 text-sem-danger",
  lost: "bg-sem-lost/12 text-sem-lost",
  info: "bg-sem-info/12 text-sem-info",
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
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />}
      {children}
    </span>
  );
}
