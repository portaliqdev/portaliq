import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 74 -> "6'2\"" */
export function formatHeight(inches: number | undefined | null): string {
  if (!inches) return "—";
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

/** 210 -> "210 lb" */
export function formatWeight(lbs: number | undefined | null): string {
  return lbs ? `${lbs} lb` : "—";
}

/** 0.9123 -> "0.9123" (247/On3 composite style) */
export function formatComposite(c: number | undefined | null): string {
  return typeof c === "number" ? c.toFixed(4) : "—";
}

/** Compact integer with thousands separators. */
export function fmt(n: number | undefined | null, digits = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** ISO date -> "Jun 16" */
export function shortDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Jun 16, 2026" */
export function longDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Days from now until an ISO date (negative if past). */
export function daysUntil(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

/** "Trevor Lawrence" -> "TL" */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Ordinal: 1 -> "1st", 2 -> "2nd". */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
