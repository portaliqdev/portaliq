import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Premium data table primitives. One hairline under the header, near-invisible row
 * dividers, and a soft row-hover — analytics output, not a spreadsheet grid.
 */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-[13px]", className)}>{children}</table>
    </div>
  );
}

export function THead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead>
      <tr className={cn("border-b border-hairline text-left", className)}>{children}</tr>
    </thead>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-white/[0.04]">{children}</tbody>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn("transition-colors hover:bg-white/[0.03]", className)}>{children}</tr>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2", className)}>{children}</td>;
}
