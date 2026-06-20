import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 ring-1 ring-hairline">
          <Icon size={22} className="text-ink-muted" />
        </div>
      )}
      <div>
        <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
