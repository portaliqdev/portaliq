import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ stars, className }: { stars: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} title={`${stars}-star recruit`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < stars ? "fill-amber-500 text-amber-500" : "text-white/15"}
        />
      ))}
    </span>
  );
}
