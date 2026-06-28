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
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center animate-fade-in">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-hairline edge-highlight">
          <Icon size={24} className="text-ink-muted" />
        </div>
      )}
      <div>
        <p className="font-display text-[16px] font-semibold text-ink">{title}</p>
        {description && (
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
