/**
 * Seed Maryland's recruiting board + watchlists from REAL players (#3).
 *
 *   npm run ingest:board
 *
 * Replaces the mock board (which showed fabricated names) with a board whose
 * entries are actual portal players — distributed across stages by fit, plus a
 * couple of themed watchlists (Moneyball undervalued, top QBs). Idempotent.
 */
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import {
  players as playersTbl,
  boards as boardsTbl,
  recruitingStages as stagesTbl,
  boardEntries as entriesTbl,
  watchlists as watchlistsTbl,
} from "@/db/schema";
import { BOARD_STAGE_LABEL, BOARD_STAGE_ORDER, type PlayerStamp } from "@/types/board";
import { PlayerSchema, type Player } from "@/types/player";
import { tierFromScore } from "@/lib/scoring";
import { ORG_ID, CURRENT_SEASON } from "@/lib/constants";

const BOARD_ID = "board_2026_winter";
const OWNER = "u_dpp";
const STAGE_PLAN: [(typeof BOARD_STAGE_ORDER)[number], number][] = [
  ["OFFER_EXTENDED", 6], ["VISIT_SCHEDULED", 4], ["MUTUAL_INTEREST", 9], ["CONTACTED", 10],
  ["EVALUATING", 14], ["NEEDS_REVIEW", 9], ["COMMITTED", 4], ["LOST", 2],
];

function clean<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in row) out[k] = row[k] === null ? undefined : row[k];
  return out;
}
const stageId = (s: string) => `stage_${s.toLowerCase()}`;
function stamp(p: Player): PlayerStamp {
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

async function main() {
  const now = new Date().toISOString();

  // Top available prospects by fit → board candidates.
  const candRows = await db
    .select()
    .from(playersTbl)
    .where(and(gt(playersTbl.fitScore, 0), eq(playersTbl.portalStatus, "IN_PORTAL")))
    .orderBy(desc(playersTbl.fitScore))
    .limit(58);
  const candidates = candRows.map((r) => PlayerSchema.parse(clean(r)));

  const stages = BOARD_STAGE_ORDER.map((s, i) => ({
    id: stageId(s),
    orgId: ORG_ID,
    boardId: BOARD_ID,
    label: BOARD_STAGE_LABEL[s],
    canonicalStage: s,
    order: i,
    createdAt: now,
    updatedAt: now,
  }));

  // Spread time-in-stage so the dashboard's "stuck too long" signal is realistic
  // (a fresh seed would otherwise stamp every card with today's date).
  const baseMs = Date.now();
  const AGE_SPREAD = [1, 2, 3, 5, 8, 13, 21, 34]; // days-in-stage, deterministic by index
  const daysAgoIso = (d: number) => new Date(baseMs - d * 86_400_000).toISOString();

  const entries: (typeof entriesTbl.$inferInsert)[] = [];
  let ci = 0;
  for (const [stage, n] of STAGE_PLAN) {
    for (let k = 0; k < n && ci < candidates.length; k++, ci++) {
      const p = candidates[ci];
      const changedAt = daysAgoIso(AGE_SPREAD[ci % AGE_SPREAD.length]);
      entries.push({
        id: `be_${p.id}`,
        orgId: ORG_ID,
        boardId: BOARD_ID,
        stageId: stageId(stage),
        canonicalStage: stage,
        playerId: p.id,
        playerStamp: stamp(p),
        tier: tierFromScore(p.fitScore ?? 60),
        rank: k + 1,
        positionColumn: p.primaryPosition,
        flags: (p.undervaluation ?? 0) >= 20 ? ["UNDERVALUED"] : [],
        stageHistory: [{ stageId: stageId(stage), canonicalStage: stage, at: changedAt }],
        stageChangedAt: changedAt,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const board = {
    id: BOARD_ID,
    orgId: ORG_ID,
    name: "2026 Winter Portal Board",
    seasonYear: CURRENT_SEASON,
    windowType: "WINTER",
    description: "Primary big board for the December portal window.",
    ownerId: OWNER,
    stageIds: stages.map((s) => s.id),
    isDefault: true,
    isArchived: false,
    entryCount: entries.length,
    createdAt: now,
    updatedAt: now,
  };

  // Themed watchlists from real players.
  const uvRows = await db
    .select({ id: playersTbl.id })
    .from(playersTbl)
    .where(gt(playersTbl.undervaluation, 30))
    .orderBy(desc(playersTbl.undervaluation))
    .limit(20);
  const qbRows = await db
    .select({ id: playersTbl.id })
    .from(playersTbl)
    .where(and(eq(playersTbl.primaryPosition, "QB"), eq(playersTbl.portalStatus, "IN_PORTAL")))
    .orderBy(desc(playersTbl.fitScore))
    .limit(12);
  const watchlistRows = [
    { id: "wl_undervalued", orgId: ORG_ID, ownerId: OWNER, name: "Moneyball — Undervalued", description: "Production well above recruiting pedigree.", isShared: true, playerIds: uvRows.map((r) => r.id), playerCount: uvRows.length, createdAt: now, updatedAt: now },
    { id: "wl_qbs", orgId: ORG_ID, ownerId: OWNER, name: "QB Room Targets", description: "Top available quarterbacks by fit.", isShared: true, playerIds: qbRows.map((r) => r.id), playerCount: qbRows.length, createdAt: now, updatedAt: now },
  ];

  // Idempotent replace.
  await db.delete(entriesTbl).where(eq(entriesTbl.orgId, ORG_ID));
  await db.delete(stagesTbl).where(eq(stagesTbl.orgId, ORG_ID));
  await db.delete(boardsTbl).where(eq(boardsTbl.orgId, ORG_ID));
  await db.delete(watchlistsTbl).where(eq(watchlistsTbl.orgId, ORG_ID));

  await db.insert(boardsTbl).values(board);
  await db.insert(stagesTbl).values(stages);
  await db.insert(entriesTbl).values(entries);
  await db.insert(watchlistsTbl).values(watchlistRows);

  console.log(`✓ Board seeded: ${entries.length} entries across ${stages.length} stages, ${watchlistRows.length} watchlists.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
