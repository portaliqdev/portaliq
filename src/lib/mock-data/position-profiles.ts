import type { PositionCode } from "@/types/enums";
import type { Rng } from "./rng";

export interface PositionProfile {
  code: PositionCode;
  height: [number, number];
  weight: [number, number];
  forty?: [number, number];
  vertical?: [number, number];
  /** relative population frequency in the portal */
  freq: number;
  /** OL/DL track arm length */
  armLength?: [number, number];
}

export const PROFILES: Record<PositionCode, PositionProfile> = {
  QB: { code: "QB", height: [72, 77], weight: [195, 235], forty: [4.55, 5.05], vertical: [28, 35], freq: 8 },
  RB: { code: "RB", height: [69, 73], weight: [200, 225], forty: [4.4, 4.6], vertical: [33, 40], freq: 8 },
  FB: { code: "FB", height: [72, 74], weight: [235, 250], forty: [4.7, 4.95], vertical: [28, 33], freq: 0.6 },
  WR: { code: "WR", height: [70, 76], weight: [175, 215], forty: [4.35, 4.6], vertical: [33, 42], freq: 14 },
  TE: { code: "TE", height: [76, 79], weight: [240, 260], forty: [4.55, 4.85], vertical: [30, 36], freq: 5 },
  OT: { code: "OT", height: [77, 80], weight: [300, 325], forty: [5.1, 5.45], vertical: [24, 30], freq: 7, armLength: [33, 36] },
  OG: { code: "OG", height: [75, 78], weight: [310, 330], forty: [5.15, 5.5], vertical: [23, 29], freq: 5, armLength: [32, 35] },
  C: { code: "C", height: [74, 77], weight: [295, 315], forty: [5.15, 5.5], vertical: [23, 29], freq: 3, armLength: [32, 34] },
  EDGE: { code: "EDGE", height: [75, 78], weight: [250, 270], forty: [4.55, 4.85], vertical: [32, 38], freq: 8, armLength: [33, 35] },
  DT: { code: "DT", height: [74, 77], weight: [290, 310], forty: [4.85, 5.2], vertical: [27, 33], freq: 6, armLength: [32, 35] },
  NT: { code: "NT", height: [73, 76], weight: [310, 340], forty: [5.05, 5.4], vertical: [24, 30], freq: 2, armLength: [32, 34] },
  LB: { code: "LB", height: [72, 75], weight: [225, 245], forty: [4.55, 4.8], vertical: [31, 37], freq: 6 },
  ILB: { code: "ILB", height: [72, 75], weight: [228, 248], forty: [4.58, 4.82], vertical: [31, 36], freq: 3 },
  OLB: { code: "OLB", height: [73, 76], weight: [230, 250], forty: [4.5, 4.75], vertical: [32, 38], freq: 4 },
  CB: { code: "CB", height: [70, 74], weight: [185, 200], forty: [4.35, 4.55], vertical: [34, 42], freq: 9 },
  S: { code: "S", height: [71, 74], weight: [195, 215], forty: [4.4, 4.6], vertical: [33, 40], freq: 7 },
  NB: { code: "NB", height: [70, 72], weight: [185, 200], forty: [4.4, 4.6], vertical: [33, 40], freq: 2 },
  K: { code: "K", height: [70, 74], weight: [180, 210], freq: 1.5 },
  P: { code: "P", height: [72, 76], weight: [190, 220], freq: 1 },
  LS: { code: "LS", height: [72, 75], weight: [225, 250], freq: 0.5 },
  KR: { code: "KR", height: [69, 72], weight: [180, 200], forty: [4.35, 4.5], vertical: [36, 42], freq: 0.3 },
  PR: { code: "PR", height: [69, 72], weight: [175, 195], forty: [4.35, 4.5], vertical: [36, 42], freq: 0.3 },
};

export const ALL_POSITIONS = Object.keys(PROFILES) as PositionCode[];

/** Linear interpolation toward `t` in [0,1] with a little noise. */
function lerp(rng: Rng, min: number, max: number, t: number, noise = 0.12): number {
  const jitter = (rng.next() - 0.5) * noise;
  const c = Math.max(0, Math.min(1, t + jitter));
  return min + (max - min) * c;
}

/**
 * Generate position-specific production metrics for a starter-caliber season,
 * scaled by `talent` (0..1). Inverse stats (INT, pressuresAllowed, passerRating
 * allowed) improve as talent rises.
 */
export function generateMetrics(
  rng: Rng,
  code: PositionCode,
  talent: number,
): Record<string, number> {
  const r1 = (min: number, max: number, t = talent) => Math.round(lerp(rng, min, max, t));
  const r2 = (min: number, max: number, t = talent) => Math.round(lerp(rng, min, max, t) * 10) / 10;
  const inv = 1 - talent;

  switch (code) {
    case "QB":
      return {
        completions: r1(140, 300),
        attempts: r1(230, 440),
        completionPct: r2(55, 72),
        passYards: r1(1500, 4200),
        passTD: r1(10, 42),
        interceptions: r1(2, 16, inv),
        yardsPerAttempt: r2(6.5, 10.5),
        qbRating: r1(120, 185),
        rushYards: r1(-40, 700, talent * 0.6 + rng.next() * 0.4),
      };
    case "RB":
    case "KR":
      return {
        rushAttempts: r1(90, 280),
        rushYards: r1(400, 1800),
        yardsPerCarry: r2(3.8, 6.8),
        rushTD: r1(3, 22),
        receptions: r1(8, 45),
        recYards: r1(60, 520),
        missedTacklesForced: r1(15, 80),
        fumbles: r1(0, 5, inv),
      };
    case "WR":
    case "PR":
      return {
        receptions: r1(20, 95),
        targets: r1(40, 150),
        recYards: r1(300, 1400),
        yardsPerReception: r2(9, 18),
        recTD: r1(2, 15),
        dropRate: r2(2, 12, inv),
        yardsAfterCatch: r1(120, 700),
      };
    case "TE":
      return {
        receptions: r1(18, 75),
        targets: r1(30, 110),
        recYards: r1(220, 950),
        yardsPerReception: r2(8, 15),
        recTD: r1(2, 12),
        dropRate: r2(2, 11, inv),
      };
    case "OT":
    case "OG":
    case "C":
      return {
        snaps: r1(450, 900),
        pressuresAllowed: r1(5, 35, inv),
        sacksAllowed: r1(0, 7, inv),
        passBlockGrade: r1(55, 92),
        runBlockGrade: r1(55, 92),
        penalties: r1(1, 9, inv),
      };
    case "EDGE":
    case "DT":
    case "NT":
      return {
        sacks: r1(1, 14),
        pressures: r1(10, 55),
        hurries: r1(6, 40),
        qbHits: r1(3, 22),
        tacklesForLoss: r1(3, 22),
        runStopPct: r2(4, 12),
        passRushWinRate: r2(8, 24),
      };
    case "LB":
    case "ILB":
    case "OLB":
      return {
        tackles: r1(35, 130),
        tacklesForLoss: r1(3, 18),
        sacks: r1(0, 9),
        missedTacklePct: r2(4, 16, inv),
        coverageGrade: r1(55, 88),
        runStopPct: r2(5, 13),
      };
    case "CB":
    case "S":
    case "NB":
      return {
        tackles: r1(25, 85),
        passBreakups: r1(3, 18),
        interceptions: r1(0, 7),
        completionPctAllowed: r2(42, 68, inv),
        passerRatingAllowed: r1(40, 115, inv),
        missedTacklePct: r2(4, 15, inv),
      };
    case "K":
      return {
        fgMade: r1(10, 27),
        fgAttempts: r1(14, 31),
        fgPct: r1(65, 92),
        longFG: r1(38, 58),
        touchbackPct: r1(40, 95),
      };
    case "P":
      return {
        netPuntAvg: r2(38, 46),
        puntsInside20: r1(8, 32),
        hangTime: r2(3.8, 4.7),
      };
    case "LS":
      return { snaps: r1(300, 700), badSnaps: r1(0, 3, inv) };
    default:
      return {};
  }
}
