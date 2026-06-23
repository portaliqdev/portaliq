/**
 * Pure, deterministic scoring math (ai-system-design.md §5–7).
 * No repository / network / mock-data dependency — both the Phase-1 seed
 * generator and the runtime service layer import these, so the numbers a coach
 * sees are produced by exactly one implementation.
 */
import type { Player } from "@/types/player";
import type { Organization } from "@/types/user";
import type { EvaluationTier, NeedPriority, PositionGroup, PositionCode } from "@/types/enums";

/** Positions without their own need row borrow the nearest room's score. */
const NEED_FALLBACK: Partial<Record<PositionCode, PositionCode>> = {
  ILB: "LB", OLB: "LB", FB: "RB", KR: "RB", PR: "WR",
};

export function resolveNeedScore(
  needByPos: Map<PositionCode, number>,
  code: PositionCode,
): number {
  if (needByPos.has(code)) return needByPos.get(code)!;
  const f = NEED_FALLBACK[code];
  return f && needByPos.has(f) ? needByPos.get(f)! : 35;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/** Stable 0..1 pseudo-random from a string id (FNV-1a). */
export function hash01(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Map a PFF-style 0–99 grade + availability into a 0–100 raw production value. */
export function productionRaw(
  pffOverall: number | undefined,
  snaps: number | undefined,
  gamesStarted: number | undefined,
): number {
  const pff = pffOverall ?? 60;
  const base = clamp(((pff - 45) / (92 - 45)) * 100);
  const availability = 0.7 + 0.3 * Math.min(1, (snaps ?? 300) / 650);
  const starterBump = (gamesStarted ?? 0) >= 9 ? 1.05 : 1;
  return clamp(base * availability * starterBump);
}

/** Percentile rank of `value` within `values` (0–100). */
export function percentileRank(values: number[], value: number): number {
  if (values.length === 0) return 50;
  const below = values.filter((v) => v <= value).length;
  return clamp((below / values.length) * 100);
}

/** Recruiting pedigree from composite rating (0.70 → 0, 1.00 → 100). */
export function pedigreeScore(composite: number): number {
  return clamp(((composite - 0.7) / (1.0 - 0.7)) * 100);
}

/** Eligibility value — more years remaining (and grad immediate-eligibility) is worth more. */
export function eligibilityValue(player: Player): number {
  const yrs = player.eligibility.yearsRemaining;
  const byYears = [30, 58, 80, 92, 100][Math.min(4, Math.max(0, yrs))] ?? 100;
  const gradBump = player.eligibility.isGraduate ? 4 : 0;
  return clamp(byYears + gradBump);
}

/**
 * Scheme-fit (0–100) of a player to Maryland's scheme — a spread/RPO offense
 * and a multiple nickel (4-2-5) defense. Fully attribute-driven (NO per-player
 * randomness): a position-group base reflecting how central the group is to the
 * scheme, adjusted by measurable prototype fit, real production, and runway.
 * Every component is explainable to a coach.
 */
export function schemeFitScore(player: Player, org: Organization): number {
  const g = player.positionGroup;

  // How much Maryland's scheme features each room: spread leans skill-heavy,
  // the 4-2-5 nickel puts a premium on DBs and a quick, rangy front.
  const groupBase: Partial<Record<PositionGroup, number>> = {
    QB: 70, WR: 70, RB: 64, TE: 60, OL: 62,
    DB: 70, DL: 66, LB: 58, ST: 50,
  };
  let s = groupBase[g] ?? 58;

  // Measurable prototype fit — only when real measurables exist (w>0).
  const w = player.weightLbs;
  const h = player.heightInches;
  if (w > 0) {
    if (g === "WR" || g === "RB" || g === "DB") {
      s += w <= 200 ? 8 : w <= 215 ? 2 : -4; // spread/nickel reward twitchy skill
    } else if (g === "OL") {
      s += w >= 300 ? 6 : w >= 285 ? 0 : -6; // need anchors to run RPO downhill
      if (h >= 76) s += 2;
    } else if (g === "DL") {
      s += w >= 270 && w <= 300 ? 6 : w < 260 ? -3 : 0; // rangy, gap-quick front
    } else if (g === "TE") {
      s += w >= 235 && w <= 260 ? 5 : 0; // move tight end
    }
  }

  // Real production translates to scheme readiness (±~7 across the range).
  s += ((player.productionScore ?? 50) - 50) * 0.14;
  // Multi-year players fit a develop-and-retain model.
  s += (player.eligibility.yearsRemaining - 2) * 1.5;

  void org.offenseScheme;
  void org.defenseScheme;
  return clamp(Math.round(s));
}

export interface FitInputs {
  /** position need score (0–100) for the player's primary position */
  needScore: number;
  /** production percentile (0–100) within the player's position group */
  productionPercentile: number;
}

/**
 * Composite fit score (0–100): the headline "should we recruit this player
 * for OUR program" number. Transparent weighted blend — implementable with no LLM.
 */
export function computeFitScore(
  player: Player,
  org: Organization,
  inputs: FitInputs,
): number {
  const production = inputs.productionPercentile;
  const scheme = schemeFitScore(player, org);
  const elig = eligibilityValue(player);
  const need = inputs.needScore;
  const pedigree = pedigreeScore(player.compositeRating);

  const score =
    production * 0.28 +
    scheme * 0.22 +
    elig * 0.16 +
    need * 0.18 +
    pedigree * 0.16;

  return Math.round(clamp(score));
}

/** Moneyball signal: production percentile minus recruiting-pedigree percentile. */
export function undervaluation(
  productionPercentile: number,
  recruitingPercentile: number,
): number {
  return Math.round(productionPercentile - recruitingPercentile);
}

/** Tier bucket from a 0–100 grade/fit score. */
export function tierFromScore(score: number): EvaluationTier {
  if (score >= 90) return "CHAMPION";
  if (score >= 75) return "STARTER";
  if (score >= 60) return "CONTRIBUTOR";
  if (score >= 45) return "DEVELOPMENTAL";
  return "DO_NOT_RECRUIT";
}

export function needPriorityFromScore(needScore: number): NeedPriority {
  if (needScore >= 80) return "CRITICAL";
  if (needScore >= 60) return "HIGH";
  if (needScore >= 40) return "MEDIUM";
  if (needScore >= 20) return "LOW";
  return "NONE";
}

/** Need score (0–100): gap between ideal depth and projected returning, quality-adjusted. */
export function computeNeedScore(
  idealDepth: number,
  projectedReturning: number,
  qualityGap = 0,
): number {
  const depthGap = Math.max(0, idealDepth - projectedReturning);
  const perSlot = 100 / Math.max(1, idealDepth);
  const raw = depthGap * perSlot + qualityGap * 12;
  return Math.round(clamp(raw));
}

/* ──────────────────────────────────────────────────────────────────────────
 * Similar players — feature-vector euclidean distance within a position group
 * ────────────────────────────────────────────────────────────────────────── */

function featureVector(p: Player): number[] {
  return [
    (p.heightInches - 68) / 14, // ~0..1 across 68–82"
    (p.weightLbs - 170) / 180, // ~0..1 across 170–350
    (p.productionScore ?? 50) / 100,
    p.stars / 5,
    pedigreeScore(p.compositeRating) / 100,
    (p.fitScore ?? 60) / 100,
    p.eligibility.yearsRemaining / 4,
  ];
}

export function similarity(a: Player, b: Player): number {
  const va = featureVector(a);
  const vb = featureVector(b);
  let sum = 0;
  for (let i = 0; i < va.length; i++) sum += (va[i] - vb[i]) ** 2;
  const dist = Math.sqrt(sum);
  const maxDist = Math.sqrt(va.length); // each dim in ~[0,1]
  return Math.round(clamp((1 - dist / maxDist) * 100));
}

export function findSimilar(target: Player, pool: Player[], n = 5): Player[] {
  return pool
    .filter((p) => p.id !== target.id && p.positionGroup === target.positionGroup)
    .map((p) => ({ p, s: similarity(target, p) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, n)
    .map((x) => x.p);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Roster impact — how adding one player changes a position room's strength
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * On-field contributors per position (starters + immediate rotation), NOT total
 * roster bodies. A "room score" should reflect who actually plays, so the model
 * weights the rotation — a depth chart of 16 corners is still won or lost by the
 * top three. Defaults to 2 for anything unlisted.
 */
export const ROOM_ROTATION: Partial<Record<PositionCode, number>> = {
  QB: 1, RB: 2, WR: 4, TE: 2, FB: 1,
  OT: 2, OG: 2, C: 1,
  DT: 2, EDGE: 2, NT: 1,
  LB: 2, ILB: 2, OLB: 2,
  CB: 3, S: 2, NB: 1,
  K: 1, P: 1, LS: 1, KR: 1, PR: 1,
};

/** A missing rotation body counts as replacement level when scoring a thin room. */
const REPLACEMENT_GRADE = 40;

/**
 * Project a returning roster slot onto a 0–100 contribution grade. Uses the
 * stored projectedGrade when present; otherwise derives one from depth rank and
 * starter status (the ingest path does not grade every walk-on).
 */
export function slotContributionGrade(slot: {
  projectedGrade?: number;
  starter?: boolean;
  depthRank: number;
  departureRisk?: string;
}): number {
  if (slot.projectedGrade != null) return clamp(slot.projectedGrade);
  // No stored grade (e.g. OT/K/P/LS): derive one that decays down the depth
  // chart so a room isn't a flat line — otherwise no transfer can stand out.
  let g = 56 - (slot.depthRank - 1) * 4;
  if (slot.starter) g += 2;
  if (slot.departureRisk === "HIGH") g -= 3;
  return clamp(Math.round(g), 30, 82);
}

/**
 * A portal candidate's projected contribution grade, on the SAME 0–100 scale as
 * roster slots: blends real production, scheme fit, and recruiting pedigree, then
 * regresses 15% toward the mean so a single strong season is not over-trusted.
 */
export function candidateContributionGrade(player: Player, org: Organization): number {
  const production = player.productionScore ?? 50;
  const scheme = schemeFitScore(player, org);
  const pedigree = pedigreeScore(player.compositeRating);
  const raw = production * 0.5 + scheme * 0.3 + pedigree * 0.2;
  return clamp(Math.round(raw * 0.85 + 50 * 0.15));
}

/**
 * Weighted strength of a position room (0–100): the rotation's grades, top-
 * weighted, with replacement-level fill for missing bodies.
 */
export function roomScore(grades: number[], position: PositionCode): number {
  const rotation = (ROOM_ROTATION[position] ?? 2) + 1; // starters + a swing backup
  const sorted = [...grades].sort((a, b) => b - a);
  let num = 0;
  let den = 0;
  for (let i = 0; i < rotation; i++) {
    const w = Math.max(0.18, 1 - i * 0.22);
    num += (sorted[i] ?? REPLACEMENT_GRADE) * w;
    den += w;
  }
  return Math.round(num / den);
}

export type ProjectedRole = "DAY_1_STARTER" | "ROTATION" | "DEPTH";

export interface RosterImpact {
  position: PositionCode;
  currentRoom: number;
  projectedRoom: number;
  net: number;
  candidateGrade: number;
  rotationRank: number; // 1-based rank among the room after adding the player
  role: ProjectedRole;
  reasons: string[];
}

/** Compute the full before→after roster impact of adding `player` to its room. */
export function computeRosterImpact(args: {
  player: Player;
  org: Organization;
  roomGrades: number[]; // existing slot contribution grades for the position
  position: PositionCode;
  needScore: number; // 0–100 positional need
}): RosterImpact {
  const { player, org, roomGrades, position, needScore } = args;
  const candidateGrade = candidateContributionGrade(player, org);
  const currentRoom = roomScore(roomGrades, position);
  const projectedRoom = roomScore([...roomGrades, candidateGrade], position);
  const net = projectedRoom - currentRoom;

  const starters = ROOM_ROTATION[position] ?? 2;
  const rotationRank = roomGrades.filter((g) => g > candidateGrade).length + 1;
  const role: ProjectedRole =
    rotationRank <= starters ? "DAY_1_STARTER" : rotationRank <= starters + 1 ? "ROTATION" : "DEPTH";

  const reasons: string[] = [];
  const production = player.productionScore ?? 50;
  if (production >= 70) reasons.push(`Strong production (${Math.round(production)} percentile)`);
  else if (production >= 55) reasons.push(`Solid production (${Math.round(production)} percentile)`);
  const scheme = schemeFitScore(player, org);
  if (scheme >= 68) reasons.push("Strong scheme fit");
  if (needScore >= 75) reasons.push("Fills a critical positional need");
  else if (needScore >= 55) reasons.push("Addresses a high positional need");
  if (player.eligibility.yearsRemaining >= 2) {
    reasons.push(`${player.eligibility.yearsRemaining} years of eligibility remaining`);
  }
  if (reasons.length === 0) reasons.push("Adds graded depth to the room");

  return { position, currentRoom, projectedRoom, net, candidateGrade, rotationRank, role, reasons };
}
