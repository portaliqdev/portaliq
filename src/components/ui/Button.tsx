import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-[#08090c] font-semibold shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] hover:bg-brand-400 hover:shadow-glow",
  secondary:
    "border border-hairline-strong bg-surface-2 text-ink hover:bg-surface-3 hover:border-hairline-heavy",
  ghost: "text-ink-sub hover:bg-surface-2 hover:text-ink",
  gold: "bg-amber-500 text-[#1a1205] font-semibold hover:bg-amber-400",
  danger: "bg-sem-danger/90 text-[#1a0606] font-semibold hover:bg-sem-danger",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
  lg: "h-11 px-5 text-[14px] gap-2 rounded-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading = false, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "group/btn relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium",
          "transition-[background-color,box-shadow,transform,border-color] duration-[var(--duration-base)] ease-out",
          "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
          "focus-visible:outline-none focus-visible:shadow-focus",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {loading && <Spinner size={size === "lg" ? 18 : 15} className="-ml-0.5" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
