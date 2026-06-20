import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-md-red text-white hover:bg-md-red-hover",
  secondary:
    "border border-hairline-strong bg-surface-2 text-ink hover:bg-surface-3",
  ghost: "text-ink-sub hover:bg-surface-2 hover:text-ink",
  gold: "bg-md-gold text-ink-inverse hover:bg-md-gold-hover",
  danger: "bg-sem-danger text-white hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1",
  md: "h-9 px-3.5 text-[13px] gap-1.5",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
