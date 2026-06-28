import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-hairline-strong bg-surface-3 px-1 font-mono text-[10px] font-medium text-ink-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
