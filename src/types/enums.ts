import { z } from "zod";

/* ──────────────────────────────────────────────────────────────────────────
 * Shared enums — single source of truth (database-design.md §1)
 * ────────────────────────────────────────────────────────────────────────── */

export const PositionCode = z.enum([
  "QB", "RB", "FB", "WR", "TE", "OT", "OG", "C",
  "EDGE", "DT", "NT", "LB", "ILB", "OLB", "CB", "S", "NB",
  "K", "P", "LS", "KR", "PR",
]);
export type PositionCode = z.infer<typeof PositionCode>;

export const PositionGroup = z.enum([
  "QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "ST",
]);
export type PositionGroup = z.infer<typeof PositionGroup>;

export const PositionSide = z.enum(["offense", "defense", "special"]);
export type PositionSide = z.infer<typeof PositionSide>;

export const Conference = z.enum([
  "Big Ten", "SEC", "ACC", "Big 12",
  "American", "Mountain West", "Sun Belt", "MAC", "Conference USA",
  "Pac-12", "Independent",
]);
export type Conference = z.infer<typeof Conference>;

export const POWER_CONFERENCES: Conference[] = ["Big Ten", "SEC", "ACC", "Big 12"];

export const EligibilityClass = z.enum([
  "FR", "RS-FR", "SO", "RS-SO", "JR", "RS-JR", "SR", "RS-SR", "GR",
]);
export type EligibilityClass = z.infer<typeof EligibilityClass>;

export const PortalStatus = z.enum([
  "IN_PORTAL", "COMMITTED", "WITHDRAWN", "ENROLLED",
]);
export type PortalStatus = z.infer<typeof PortalStatus>;

export const BoardStage = z.enum([
  "NEEDS_REVIEW", "EVALUATING", "CONTACTED", "MUTUAL_INTEREST",
  "VISIT_SCHEDULED", "OFFER_EXTENDED", "COMMITTED", "LOST",
]);
export type BoardStage = z.infer<typeof BoardStage>;

export const EvaluationTier = z.enum([
  "CHAMPION", "STARTER", "CONTRIBUTOR", "DEVELOPMENTAL", "DO_NOT_RECRUIT",
]);
export type EvaluationTier = z.infer<typeof EvaluationTier>;

export const ScholarshipStatus = z.enum([
  "SCHOLARSHIP", "PREFERRED_WALK_ON", "WALK_ON",
]);
export type ScholarshipStatus = z.infer<typeof ScholarshipStatus>;

export const WindowType = z.enum(["WINTER", "SPRING", "EXCEPTION"]);
export type WindowType = z.infer<typeof WindowType>;

export const EnrollmentTiming = z.enum(["MID_YEAR", "SUMMER"]);
export type EnrollmentTiming = z.infer<typeof EnrollmentTiming>;

export const RecruitingStatus = z.enum([
  "UNEVALUATED", "EVALUATING", "TARGET", "HOT",
  "COMMITTED_TO_US", "LOST", "OFF_BOARD",
]);
export type RecruitingStatus = z.infer<typeof RecruitingStatus>;

export const OffenseScheme = z.enum([
  "AIR_RAID", "SPREAD", "PRO_STYLE", "RPO", "ZONE_RUN", "GAP_POWER",
]);
export type OffenseScheme = z.infer<typeof OffenseScheme>;

export const DefenseScheme = z.enum([
  "FOUR_THREE", "THREE_FOUR", "MULTIPLE", "NICKEL_425",
  "MAN_COVERAGE", "ZONE_COVERAGE",
]);
export type DefenseScheme = z.infer<typeof DefenseScheme>;

export const DepartureRisk = z.enum(["NONE", "LOW", "MED", "HIGH"]);
export type DepartureRisk = z.infer<typeof DepartureRisk>;

export const NeedPriority = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"]);
export type NeedPriority = z.infer<typeof NeedPriority>;

/* ──────────────────────────────────────────────────────────────────────────
 * Position metadata — code → group / side / label / scheme side
 * ────────────────────────────────────────────────────────────────────────── */

export interface PositionMeta {
  code: PositionCode;
  group: PositionGroup;
  side: PositionSide;
  label: string;
}

export const POSITION_META: Record<PositionCode, PositionMeta> = {
  QB: { code: "QB", group: "QB", side: "offense", label: "Quarterback" },
  RB: { code: "RB", group: "RB", side: "offense", label: "Running Back" },
  FB: { code: "FB", group: "RB", side: "offense", label: "Fullback" },
  WR: { code: "WR", group: "WR", side: "offense", label: "Wide Receiver" },
  TE: { code: "TE", group: "TE", side: "offense", label: "Tight End" },
  OT: { code: "OT", group: "OL", side: "offense", label: "Offensive Tackle" },
  OG: { code: "OG", group: "OL", side: "offense", label: "Offensive Guard" },
  C: { code: "C", group: "OL", side: "offense", label: "Center" },
  EDGE: { code: "EDGE", group: "DL", side: "defense", label: "Edge Rusher" },
  DT: { code: "DT", group: "DL", side: "defense", label: "Defensive Tackle" },
  NT: { code: "NT", group: "DL", side: "defense", label: "Nose Tackle" },
  LB: { code: "LB", group: "LB", side: "defense", label: "Linebacker" },
  ILB: { code: "ILB", group: "LB", side: "defense", label: "Inside Linebacker" },
  OLB: { code: "OLB", group: "LB", side: "defense", label: "Outside Linebacker" },
  CB: { code: "CB", group: "DB", side: "defense", label: "Cornerback" },
  S: { code: "S", group: "DB", side: "defense", label: "Safety" },
  NB: { code: "NB", group: "DB", side: "defense", label: "Nickelback" },
  K: { code: "K", group: "ST", side: "special", label: "Kicker" },
  P: { code: "P", group: "ST", side: "special", label: "Punter" },
  LS: { code: "LS", group: "ST", side: "special", label: "Long Snapper" },
  KR: { code: "KR", group: "ST", side: "special", label: "Kick Returner" },
  PR: { code: "PR", group: "ST", side: "special", label: "Punt Returner" },
};

export const POSITION_GROUPS: PositionGroup[] = [
  "QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "ST",
];

export function positionGroup(code: PositionCode): PositionGroup {
  return POSITION_META[code].group;
}

export function positionSide(code: PositionCode): PositionSide {
  return POSITION_META[code].side;
}

/** Tailwind text color class for a position group (matches tailwind.config pos.*) */
export const POSITION_GROUP_COLOR: Record<PositionGroup, string> = {
  QB: "text-pos-qb",
  RB: "text-pos-rb",
  WR: "text-pos-wr",
  TE: "text-pos-te",
  OL: "text-pos-ol",
  DL: "text-pos-dl",
  LB: "text-pos-lb",
  DB: "text-pos-db",
  ST: "text-pos-st",
};

export const POSITION_GROUP_HEX: Record<PositionGroup, string> = {
  QB: "#F97316",
  RB: "#FB7185",
  WR: "#38BDF8",
  TE: "#2DD4BF",
  OL: "#A78BFA",
  DL: "#FACC15",
  LB: "#34D399",
  DB: "#818CF8",
  ST: "#94A3B8",
};
