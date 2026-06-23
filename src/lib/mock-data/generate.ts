import type { Player, EligibilityBlock } from "@/types/player";
import type { School } from "@/types/school";
import type { Organization, User } from "@/types/user";
import type { PlayerStats, PlayerMeasurements, FilmLink, TransferEntry } from "@/types/stats";
import type { Evaluation } from "@/types/evaluation";
import type { ScoutingReport } from "@/types/scouting-report";
import type { Board, RecruitingStage, BoardEntry, Watchlist, PlayerStamp } from "@/types/board";
import type { RosterSnapshot, RosterSlot, PositionNeed } from "@/types/team-needs";
import type { AIInsight } from "@/types/ai";
import type {
  PositionCode,
  EligibilityClass,
  ScholarshipStatus,
  PortalStatus,
  WindowType,
  BoardStage,
  RecruitingStatus,
} from "@/types/enums";
import { POSITION_META, positionGroup } from "@/types/enums";
import { BOARD_STAGE_LABEL } from "@/types/board";
import { Rng } from "./rng";
import { SCHOOLS, SCHOOL_BY_ID, MARYLAND, slugify } from "./schools";
import { FIRST_NAMES, LAST_NAMES, cityFor } from "./names";
import { PROFILES, ALL_POSITIONS, generateMetrics } from "./position-profiles";
import {
  productionRaw,
  percentileRank,
  pedigreeScore,
  computeFitScore,
  computeNeedScore,
  needPriorityFromScore,
  undervaluation,
  tierFromScore,
} from "@/lib/scoring";

const ORG_ID = "org_maryland";
const NOW = "2026-06-10T12:00:00.000Z";
const SEASON = 2026;

export interface MockDB {
  org: Organization;
  users: User[];
  schools: School[];
  players: Player[];
  stats: PlayerStats[];
  measurements: PlayerMeasurements[];
  filmLinks: FilmLink[];
  transferEntries: TransferEntry[];
  evaluations: Evaluation[];
  scoutingReports: ScoutingReport[];
  aiInsights: AIInsight[];
  board: Board;
  stages: RecruitingStage[];
  boardEntries: BoardEntry[];
  watchlists: Watchlist[];
  rosterSnapshot: RosterSnapshot;
  teamNeeds: PositionNeed[];
}

const STAR_WEIGHTS: [number, number][] = [[5, 8], [4, 30], [3, 50], [2, 12]];
const COMPOSITE_BAND: Record<number, [number, number]> = {
  5: [0.97, 1.0],
  4: [0.89, 0.969],
  3: [0.83, 0.889],
  2: [0.7, 0.829],
};
const CLASS_WEIGHTS: [EligibilityClass, number][] = [
  ["SO", 18], ["RS-SO", 14], ["JR", 20], ["RS-JR", 14],
  ["SR", 10], ["RS-SR", 8], ["GR", 12], ["RS-FR", 3], ["FR", 1],
];
const CLASS_SEASONS_USED: Record<EligibilityClass, number> = {
  FR: 0, "RS-FR": 1, SO: 1, "RS-SO": 2, JR: 2, "RS-JR": 3, SR: 3, "RS-SR": 4, GR: 4,
};
const SCHOLARSHIP_WEIGHTS: [ScholarshipStatus, number][] = [
  ["SCHOLARSHIP", 80], ["PREFERRED_WALK_ON", 15], ["WALK_ON", 5],
];
const PORTAL_WEIGHTS: [PortalStatus, number][] = [
  ["IN_PORTAL", 60], ["COMMITTED", 20], ["WITHDRAWN", 12], ["ENROLLED", 8],
];
const WINDOW_WEIGHTS: [WindowType, number][] = [
  ["WINTER", 70], ["SPRING", 20], ["EXCEPTION", 10],
];
const AWARD_POOL = [
  "All-Conference 1st Team", "All-Conference 2nd Team", "Freshman All-American",
  "Team Captain", "All-American HM", "Conference Player of Week",
  "Bowl MVP", "Academic All-Conference",
];

function pickConferenceSkewedSchool(rng: Rng): School {
  // Skew toward Power-4 with a Group-of-Five tail; exclude Maryland most of the time.
  const power = SCHOOLS.filter((s) => s.isPower && s.id !== MARYLAND.id);
  const g5 = SCHOOLS.filter((s) => !s.isPower);
  const pool = rng.bool(0.8) ? power : g5;
  return rng.pick(pool);
}

function makeEligibility(rng: Rng, cls: EligibilityClass): EligibilityBlock {
  const seasonsUsed = CLASS_SEASONS_USED[cls];
  const extraYears = cls === "GR" && rng.bool(0.4) ? 1 : 0;
  const yearsRemaining = Math.max(0, Math.min(4, 4 - seasonsUsed + extraYears));
  return {
    seasonsAllowed: 4,
    seasonsUsed,
    redshirtUsed: cls.startsWith("RS-") || cls === "GR",
    extraYears,
    yearsRemaining,
    clockExpiresSeason: SEASON + Math.max(1, yearsRemaining + 1),
    isGraduate: cls === "GR",
  };
}

interface RawPlayer {
  player: Player;
  latest: PlayerStats;
  prior?: PlayerStats;
  measurement: PlayerMeasurements;
  film: FilmLink[];
  transfer: TransferEntry;
  talent: number;
  prodRaw: number;
}

function generateRawPlayer(rng: Rng, idx: number): RawPlayer {
  const pos = rng.weighted(ALL_POSITIONS.map((p) => [p, PROFILES[p].freq] as [PositionCode, number]));
  const profile = PROFILES[pos];
  const group = positionGroup(pos);
  const school = pickConferenceSkewedSchool(rng);

  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  const fullName = `${first} ${last}`;
  const id = `player_${slugify(last)}_${pos.toLowerCase()}_${(idx + 1000).toString(36)}`;

  const height = rng.gauss(
    (profile.height[0] + profile.height[1]) / 2,
    (profile.height[1] - profile.height[0]) / 2,
    profile.height[0] - 1,
    profile.height[1] + 1,
  );
  const weight = rng.gauss(
    (profile.weight[0] + profile.weight[1]) / 2,
    (profile.weight[1] - profile.weight[0]) / 2,
    profile.weight[0] - 5,
    profile.weight[1] + 8,
  );

  const stars = rng.weighted(STAR_WEIGHTS);
  const band = COMPOSITE_BAND[stars];
  const compositeRating = rng.float(band[0], band[1], 4);

  const cls = rng.weighted(CLASS_WEIGHTS);
  const eligibility = makeEligibility(rng, cls);
  const scholarshipStatus = rng.weighted(SCHOLARSHIP_WEIGHTS);
  const portalStatus = rng.weighted(PORTAL_WEIGHTS);

  // Latent talent correlated with pedigree, with room for "undervalued" outliers.
  const talent = Math.max(
    0,
    Math.min(1, pedigreeScore(compositeRating) / 100 * 0.55 + rng.next() * 0.45),
  );
  const pffOverall = rng.gauss(52 + talent * 40, 6, 44, 93);
  const gamesPlayed = rng.int(6, 13);
  const gamesStarted = Math.min(gamesPlayed, rng.bool(0.6) ? rng.int(6, 13) : rng.int(0, 6));
  const snaps = rng.int(180, 880);

  const latest: PlayerStats = {
    id: `stats_${id}_2025`,
    orgId: ORG_ID,
    playerId: id,
    seasonYear: 2025,
    schoolId: school.id,
    schoolName: school.name,
    position: pos,
    gamesPlayed,
    gamesStarted,
    snaps,
    pffOverall,
    metrics: profile ? generateMetrics(rng, pos, talent) : {},
    source: rng.pick(["PFF", "247", "ourAnalyst"]),
    verified: rng.bool(0.7),
    createdAt: NOW,
    updatedAt: NOW,
  };

  let prior: PlayerStats | undefined;
  if (eligibility.seasonsUsed >= 2 && rng.bool(0.7)) {
    prior = {
      ...latest,
      id: `stats_${id}_2024`,
      seasonYear: 2024,
      gamesPlayed: rng.int(4, 12),
      gamesStarted: rng.int(0, 10),
      snaps: rng.int(120, 700),
      pffOverall: rng.gauss(50 + talent * 36, 6, 42, 90),
      metrics: generateMetrics(rng, pos, Math.max(0, talent - rng.float(0, 0.18, 2))),
      createdAt: NOW,
      updatedAt: NOW,
    };
  }

  const measurement: PlayerMeasurements = {
    id: `meas_${id}`,
    orgId: ORG_ID,
    playerId: id,
    measuredAt: "2026-03-01T00:00:00.000Z",
    source: rng.pick(["Combine", "ProDay", "verified"]),
    heightInches: height,
    weightLbs: weight,
    wingspanInches: profile.armLength ? height + rng.int(2, 6) : undefined,
    armLengthInches: profile.armLength ? rng.float(profile.armLength[0], profile.armLength[1], 1) : undefined,
    handSizeInches: rng.float(8.5, 10.5, 1),
    fortyYard: profile.forty ? rng.float(profile.forty[0], profile.forty[1], 2) : undefined,
    tenYardSplit: profile.forty ? rng.float(1.5, 1.75, 2) : undefined,
    verticalInches: profile.vertical ? rng.int(profile.vertical[0], profile.vertical[1]) : undefined,
    broadJumpInches: profile.vertical ? rng.int(108, 132) : undefined,
    threeCone: rng.bool(0.5) ? rng.float(6.7, 7.4, 2) : undefined,
    shuttle: rng.bool(0.5) ? rng.float(4.0, 4.6, 2) : undefined,
    benchReps: rng.bool(0.4) ? rng.int(12, 32) : undefined,
    verified: rng.bool(0.6),
    createdAt: NOW,
    updatedAt: NOW,
  };

  const filmCount = rng.int(1, 3);
  const film: FilmLink[] = Array.from({ length: filmCount }).map((_, i) => ({
    id: `film_${id}_${i}`,
    orgId: ORG_ID,
    playerId: id,
    url: `https://hudl.com/film/${slugify(last)}-${i}`,
    type: rng.pick(["CUT_UP", "ALL_22", "HIGHLIGHT", "GAME"] as const),
    title: `${rng.pick(["vs", "@"])} ${rng.pick(SCHOOLS).name} 2025`,
    seasonYear: 2025,
    durationSec: rng.int(240, 1200),
    createdAt: NOW,
    updatedAt: NOW,
  }));

  const windowType = rng.weighted(WINDOW_WEIGHTS);
  const enteredAt =
    windowType === "WINTER"
      ? `2025-12-${String(rng.int(9, 28)).padStart(2, "0")}T00:00:00.000Z`
      : windowType === "SPRING"
        ? `2026-04-${String(rng.int(16, 28)).padStart(2, "0")}T00:00:00.000Z`
        : `2026-0${rng.int(1, 5)}-${String(rng.int(1, 28)).padStart(2, "0")}T00:00:00.000Z`;

  const transfer: TransferEntry = {
    id: `te_${id}`,
    orgId: ORG_ID,
    playerId: id,
    fromSchoolId: school.id,
    fromSchoolName: school.name,
    status: portalStatus,
    windowType,
    seasonYear: SEASON,
    enteredAt,
    isGradTransfer: eligibility.isGraduate,
    outgoing: false,
    enrollmentTiming: rng.bool(0.45) ? "MID_YEAR" : "SUMMER",
    statusHistory: [{ status: "IN_PORTAL", at: enteredAt }],
    createdAt: NOW,
    updatedAt: NOW,
  };
  if (portalStatus === "COMMITTED" || portalStatus === "ENROLLED") {
    const dest = rng.pick(SCHOOLS);
    transfer.committedToSchoolId = dest.id;
    transfer.committedToSchoolName = dest.name;
    transfer.committedAt = "2026-01-10T00:00:00.000Z";
  }

  const homeState = rng.bool(0.5) ? school.state : rng.pick(SCHOOLS).state;

  const player: Player = {
    id,
    orgId: ORG_ID,
    firstName: first,
    lastName: last,
    fullName,
    currentSchoolId: school.id,
    currentSchool: {
      id: school.id,
      name: school.name,
      conference: school.conference,
      primaryColor: school.primaryColor,
    },
    previousSchoolIds: rng.bool(0.25) ? [rng.pick(SCHOOLS).id] : [],
    primaryPosition: pos,
    secondaryPositions: rng.bool(0.18) ? [rng.pick(ALL_POSITIONS)] : [],
    positionGroup: group,
    jerseyNumber: rng.int(1, 99),
    heightInches: height,
    weightLbs: weight,
    handedness: pos === "QB" ? (rng.bool(0.85) ? "R" : "L") : undefined,
    hometown: cityFor(homeState, (a) => rng.pick(a)),
    homeState,
    stars,
    compositeRating,
    nationalRank: rng.int(20, 1500),
    positionRank: rng.int(1, 120),
    eligibilityClass: cls,
    eligibility,
    scholarshipStatus,
    portalStatus,
    awards: rng.bool(0.5) ? rng.sample(AWARD_POOL, rng.int(1, 3)) : [],
    injuryFlags: rng.bool(0.12) ? [rng.pick(["ACL 2024", "Hamstring 2025", "Shoulder 2023"])] : [],
    characterFlags: rng.bool(0.06) ? [rng.pick(["Suspension 2024", "Academic watch"])] : [],
    nilEstimate: rng.weighted([
      [0, 30], [rng.int(5_000, 50_000), 35], [rng.int(50_000, 250_000), 25],
      [rng.int(250_000, 1_500_000), 10],
    ]),
    watchlistIds: [],
    tags: [
      ...(windowType === "WINTER" || windowType === "SPRING" ? ["in-window"] : []),
      ...(eligibility.isGraduate ? ["grad-transfer"] : []),
    ],
    recruitingStatus: "UNEVALUATED",
    createdAt: enteredAt, // portal entry date drives "newest entrants" + entered-portal sort
    updatedAt: NOW,
  };

  const prodRaw = productionRaw(pffOverall, snaps, gamesStarted);
  return { player, latest, prior, measurement, film, transfer, talent, prodRaw };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Roster + needs (Maryland)
 * ────────────────────────────────────────────────────────────────────────── */

const ROSTER_POSITIONS: [PositionCode, number][] = [
  ["QB", 3], ["RB", 4], ["WR", 7], ["TE", 4],
  ["OT", 4], ["OG", 4], ["C", 2],
  ["EDGE", 5], ["DT", 4], ["NT", 1],
  ["LB", 6], ["CB", 6], ["S", 5], ["NB", 2],
  ["K", 1], ["P", 1], ["LS", 1],
];

function buildRoster(rng: Rng): { snapshot: RosterSnapshot; needs: PositionNeed[] } {
  const slots: RosterSlot[] = [];
  const needs: PositionNeed[] = [];
  let scholarshipCount = 0;

  for (const [pos, ideal] of ROSTER_POSITIONS) {
    const group = positionGroup(pos);
    const currentDepth = Math.max(1, ideal + rng.int(-1, 1));
    let departures = 0;
    let starterDeparting = false;

    for (let d = 1; d <= currentDepth; d++) {
      const cls = rng.weighted<EligibilityClass>([
        ["FR", 12], ["RS-FR", 12], ["SO", 16], ["RS-SO", 14],
        ["JR", 14], ["RS-JR", 12], ["SR", 10], ["RS-SR", 6], ["GR", 4],
      ]);
      const seasonsUsed = CLASS_SEASONS_USED[cls];
      const yearsRemaining = Math.max(0, 4 - seasonsUsed);
      const isSenior = cls === "SR" || cls === "RS-SR" || cls === "GR";
      const risk = isSenior
        ? "HIGH"
        : rng.weighted([["NONE", 55], ["LOW", 28], ["MED", 14], ["HIGH", 3]] as const);
      if (risk === "HIGH") {
        departures++;
        if (d === 1) starterDeparting = true;
      }
      const sch: ScholarshipStatus = d <= ideal ? "SCHOLARSHIP" : rng.weighted(SCHOLARSHIP_WEIGHTS);
      if (sch === "SCHOLARSHIP") scholarshipCount++;
      slots.push({
        id: `slot_${pos}_${d}`,
        orgId: ORG_ID,
        playerName: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
        position: pos,
        positionGroup: group,
        depthRank: d,
        eligibilityClass: cls,
        yearsRemaining,
        scholarshipStatus: sch,
        departureRisk: risk,
        starter: d === 1,
        projectedGrade: rng.int(58, 90),
      });
    }

    const incomingCommits = rng.int(0, 2);
    const projectedReturning = Math.max(0, currentDepth - departures + incomingCommits);
    const qualityGap = (starterDeparting ? 1 : 0) + (projectedReturning < ideal - 1 ? 1 : 0);
    const needScore = computeNeedScore(ideal, projectedReturning, qualityGap);
    needs.push({
      id: `need_${SEASON}_${pos}`,
      orgId: ORG_ID,
      seasonYear: SEASON,
      position: pos,
      positionGroup: group,
      idealDepth: ideal,
      currentDepth,
      projectedDepartures: departures,
      incomingCommits,
      projectedReturning,
      needScore,
      qualityGap,
      priority: needPriorityFromScore(needScore),
      availableScholarships: Math.max(0, ideal - projectedReturning),
      starterReturning: !starterDeparting,
      notes: starterDeparting ? "Projected starter departing — replace immediately." : undefined,
      computedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  const snapshot: RosterSnapshot = {
    id: `roster_${SEASON}_0610`,
    orgId: ORG_ID,
    seasonYear: SEASON,
    asOf: NOW,
    label: "Post-Spring 2026",
    slots,
    scholarshipCount,
    rosterCount: slots.length,
    scholarshipLimit: 85,
    rosterLimit: 105,
    createdAt: NOW,
    updatedAt: NOW,
  };
  return { snapshot, needs };
}

function needForPosition(needs: Map<PositionCode, PositionNeed>, code: PositionCode): number {
  if (needs.has(code)) return needs.get(code)!.needScore;
  const fallback: Partial<Record<PositionCode, PositionCode>> = {
    ILB: "LB", OLB: "LB", FB: "RB", KR: "RB", PR: "WR",
  };
  const f = fallback[code];
  return f && needs.has(f) ? needs.get(f)!.needScore : 35;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Assembly
 * ────────────────────────────────────────────────────────────────────────── */

const STAGE_TO_STATUS: Record<BoardStage, RecruitingStatus> = {
  NEEDS_REVIEW: "EVALUATING",
  EVALUATING: "EVALUATING",
  CONTACTED: "TARGET",
  MUTUAL_INTEREST: "TARGET",
  VISIT_SCHEDULED: "HOT",
  OFFER_EXTENDED: "HOT",
  COMMITTED: "COMMITTED_TO_US",
  LOST: "LOST",
};

function makeStamp(p: Player): PlayerStamp {
  return {
    fullName: p.fullName,
    primaryPosition: p.primaryPosition,
    currentSchoolName: p.currentSchool.name,
    currentSchoolConference: p.currentSchool.conference,
    stars: p.stars,
    yearsRemaining: p.eligibility.yearsRemaining,
    fitScore: p.fitScore,
    heightInches: p.heightInches,
    weightLbs: p.weightLbs,
  };
}

export function generateMockDB(seed = 20260616, count = 320): MockDB {
  const rng = new Rng(seed);

  // 1) Organization + staff
  const org: Organization = {
    id: ORG_ID,
    name: "University of Maryland",
    shortName: "Maryland",
    schoolId: MARYLAND.id,
    conference: "Big Ten",
    offenseScheme: "SPREAD",
    defenseScheme: "NICKEL_425",
    scholarshipLimit: 85,
    rosterLimit: 105,
    nilBudget: 6_500_000,
    currentSeason: SEASON,
    settings: { defaultBoardId: "board_2026_winter" },
    createdAt: NOW,
    updatedAt: NOW,
  };

  const STAFF: [string, string, User["role"], User["positionGroups"]][] = [
    ["u_dpp", "Avery Brooks", "PERSONNEL_DIRECTOR", []],
    ["u_hc", "Mike Locksley", "HEAD_COACH", []],
    ["u_oc", "Pep Hamilton", "COORDINATOR", ["QB", "WR"]],
    ["u_dc", "Ted Monachino", "COORDINATOR", ["DL", "LB", "DB"]],
    ["u_wr", "Gibril Wilson", "POSITION_COACH", ["WR"]],
    ["u_dl", "Brian Williams", "POSITION_COACH", ["DL"]],
    ["u_analyst", "Jordan Reese", "ANALYST", []],
    ["u_ga", "Sam Carter", "GA", []],
  ];
  const users: User[] = STAFF.map(([id, displayName, role, groups]) => ({
    id,
    orgId: ORG_ID,
    email: `${id.replace("u_", "")}@umd.edu`,
    displayName,
    role,
    positionGroups: groups,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  }));

  // 2) Roster + needs (must precede fit so need weights are available)
  const { snapshot: rosterSnapshot, needs: teamNeeds } = buildRoster(rng);
  const needByPos = new Map(teamNeeds.map((n) => [n.position, n]));

  // 3) Raw players
  const raws: RawPlayer[] = Array.from({ length: count }).map((_, i) =>
    generateRawPlayer(rng, i),
  );

  // 4) Percentiles by position group (production + pedigree)
  const byGroup = new Map<string, RawPlayer[]>();
  for (const r of raws) {
    const g = r.player.positionGroup;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(r);
  }
  for (const group of byGroup.values()) {
    const prod = group.map((r) => r.prodRaw);
    const ped = group.map((r) => pedigreeScore(r.player.compositeRating));
    for (const r of group) {
      const prodPct = Math.round(percentileRank(prod, r.prodRaw));
      const pedPct = Math.round(percentileRank(ped, pedigreeScore(r.player.compositeRating)));
      r.player.productionScore = prodPct;
      r.player.undervaluation = undervaluation(prodPct, pedPct);
      // 5) fit score
      r.player.fitScore = computeFitScore(r.player, org, {
        needScore: needForPosition(needByPos, r.player.primaryPosition),
        productionPercentile: prodPct,
      });
      r.player.needScore = needForPosition(needByPos, r.player.primaryPosition);
      r.player.computedAt = NOW;
    }
  }

  const players = raws.map((r) => r.player);
  const stats = raws.flatMap((r) => (r.prior ? [r.latest, r.prior] : [r.latest]));
  const measurements = raws.map((r) => r.measurement);
  const filmLinks = raws.flatMap((r) => r.film);
  const transferEntries = raws.map((r) => r.transfer);

  // 6) Board — stages + entries for the strongest available prospects
  const stages: RecruitingStage[] = (
    ["NEEDS_REVIEW", "EVALUATING", "CONTACTED", "MUTUAL_INTEREST", "VISIT_SCHEDULED", "OFFER_EXTENDED", "COMMITTED", "LOST"] as BoardStage[]
  ).map((s, i) => ({
    id: `stage_${s.toLowerCase()}`,
    orgId: ORG_ID,
    boardId: "board_2026_winter",
    label: BOARD_STAGE_LABEL[s],
    canonicalStage: s,
    order: i,
    createdAt: NOW,
    updatedAt: NOW,
  }));
  const stageId = (s: BoardStage) => `stage_${s.toLowerCase()}`;

  const board: Board = {
    id: "board_2026_winter",
    orgId: ORG_ID,
    name: "2026 Winter Portal Board",
    seasonYear: SEASON,
    windowType: "WINTER",
    description: "Primary big board for the December portal window.",
    ownerId: "u_dpp",
    stageIds: stages.map((s) => s.id),
    isDefault: true,
    isArchived: false,
    createdAt: NOW,
    updatedAt: NOW,
  };

  const boardCandidates = players
    .filter((p) => p.portalStatus === "IN_PORTAL" || p.portalStatus === "COMMITTED")
    .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))
    .slice(0, 58);

  const STAGE_PLAN: [BoardStage, number][] = [
    ["OFFER_EXTENDED", 6], ["VISIT_SCHEDULED", 4], ["MUTUAL_INTEREST", 9], ["CONTACTED", 10],
    ["EVALUATING", 14], ["NEEDS_REVIEW", 8], ["COMMITTED", 4], ["LOST", 3],
  ];
  const boardEntries: BoardEntry[] = [];
  let ci = 0;
  for (const [stage, n] of STAGE_PLAN) {
    for (let k = 0; k < n && ci < boardCandidates.length; k++, ci++) {
      const p = boardCandidates[ci];
      p.recruitingStatus = STAGE_TO_STATUS[stage];
      p.consensusTier = tierFromScore(p.fitScore ?? 60);
      p.consensusGrade = p.fitScore;
      boardEntries.push({
        id: `be_${p.id}`,
        orgId: ORG_ID,
        boardId: board.id,
        stageId: stageId(stage),
        canonicalStage: stage,
        playerId: p.id,
        playerStamp: makeStamp(p),
        tier: tierFromScore(p.fitScore ?? 60),
        rank: k + 1,
        positionColumn: p.primaryPosition,
        assignedToId: rng.pick(users).id,
        assignedToName: undefined,
        flags: [
          ...(p.tags.includes("in-window") ? ["in-window"] : []),
          ...(p.injuryFlags.length ? ["medical"] : []),
        ],
        notesCount: rng.int(0, 6),
        stageHistory: [{ stageId: stageId(stage), canonicalStage: stage, at: NOW }],
        stageChangedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
  }
  board.entryCount = boardEntries.length;

  // 7) Evaluations for priority/offer board players
  const evaluations: Evaluation[] = [];
  const scoutingReports: ScoutingReport[] = [];
  const aiInsights: AIInsight[] = [];
  const evalTargets = boardEntries.filter((e) =>
    ["OFFER_EXTENDED", "VISIT_SCHEDULED", "MUTUAL_INTEREST", "CONTACTED"].includes(e.canonicalStage),
  );
  for (const e of evalTargets) {
    const p = players.find((pl) => pl.id === e.playerId)!;
    const nEvals = rng.int(1, 3);
    for (let i = 0; i < nEvals; i++) {
      const evaluator = rng.pick(users.filter((u) => u.role !== "GA"));
      evaluations.push({
        id: `eval_${p.id}_${i}`,
        orgId: ORG_ID,
        playerId: p.id,
        evaluatorId: evaluator.id,
        evaluatorName: evaluator.displayName,
        evaluatorRole: evaluator.role,
        stage: rng.pick(["FILM", "ANALYTICS", "SCHEME_FIT", "FINAL"] as const),
        gradeScale: "NUM_99",
        numericGrade: Math.round((p.fitScore ?? 70) + rng.int(-6, 6)),
        schemeFitScore: Math.round((p.fitScore ?? 70) + rng.int(-8, 8)),
        filmReviewed: true,
        confidence: rng.pick(["MED", "HIGH"] as const),
        notes: undefined,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
  }

  // 8) AI insight headlines for the top board + most-undervalued players
  const insightTargets = new Set<string>([
    ...boardEntries.filter((e) => ["OFFER_EXTENDED", "VISIT_SCHEDULED", "MUTUAL_INTEREST"].includes(e.canonicalStage)).map((e) => e.playerId),
    ...[...players].sort((a, b) => (b.undervaluation ?? 0) - (a.undervaluation ?? 0)).slice(0, 20).map((p) => p.id),
  ]);
  for (const pid of insightTargets) {
    const p = players.find((pl) => pl.id === pid)!;
    const meta = POSITION_META[p.primaryPosition];
    const fit = p.fitScore ?? 60;
    const headline =
      (p.undervaluation ?? 0) >= 25
        ? `Undervalued ${meta.label}: production outpaces a ${p.stars}★ pedigree`
        : `${tierFromScore(fit)}-grade ${meta.label} with ${p.eligibility.yearsRemaining} yr(s) left`;
    aiInsights.push({
      id: `ai_${p.id}`,
      orgId: ORG_ID,
      playerId: p.id,
      type: (p.undervaluation ?? 0) >= 25 ? "FIT_ANALYSIS" : "SCOUTING_REPORT",
      model: "mock-portaliq-v1",
      headline,
      summary: `${p.fullName} projects as a ${tierFromScore(fit).toLowerCase().replace(/_/g, " ")} fit for Maryland's scheme (fit ${fit}).`,
      confidence: fit >= 80 ? "HIGH" : "MED",
      strengths: [],
      concerns: [],
      comparablePlayers: [],
      sourceRefs: [
        { label: "Fit score", value: String(fit) },
        { label: "Production pct", value: String(p.productionScore ?? "—") },
      ],
      generatedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    p.aiInsightId = `ai_${p.id}`;
  }

  // 9) Watchlists
  const watchlists: Watchlist[] = [
    {
      id: "wl_slot_wrs",
      orgId: ORG_ID,
      ownerId: "u_wr",
      name: "Slot WRs to watch",
      isShared: true,
      playerIds: players.filter((p) => p.primaryPosition === "WR").slice(0, 8).map((p) => p.id),
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "wl_undervalued",
      orgId: ORG_ID,
      ownerId: "u_analyst",
      name: "Moneyball: most undervalued",
      isShared: true,
      playerIds: [...players].sort((a, b) => (b.undervaluation ?? 0) - (a.undervaluation ?? 0)).slice(0, 12).map((p) => p.id),
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];
  watchlists.forEach((w) => {
    w.playerCount = w.playerIds.length;
    w.playerIds.forEach((pid) => {
      const p = players.find((pl) => pl.id === pid);
      if (p) p.watchlistIds = [...p.watchlistIds, w.id];
    });
  });

  return {
    org,
    users,
    schools: SCHOOLS,
    players,
    stats,
    measurements,
    filmLinks,
    transferEntries,
    evaluations,
    scoutingReports,
    aiInsights,
    board,
    stages,
    boardEntries,
    watchlists,
    rosterSnapshot,
    teamNeeds,
  };
}

export { SCHOOL_BY_ID };
