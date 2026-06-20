/**
 * Moneyball scoring pass (#1 + #2) — compute productionScore, undervaluation,
 * needScore, and a transparent deterministic fitScore for ALL players, using
 * the app's own scoring lib (src/lib/scoring.ts). Reusing that lib means the
 * numbers match exactly what computeFitScore/undervaluation would produce in the
 * service layer — no second implementation to drift.
 *
 *   npm run score
 *
 * production raw is derived from real CFBD 2025 metrics, percentiled WITHIN
 * position group; recruiting percentile comes from composite rating. The
 * Moneyball signal = production percentile − recruiting percentile.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { players as playersTbl, playerStats as playerStatsTbl, teamNeeds as teamNeedsTbl } from "@/db/schema";
import { PlayerSchema, type Player } from "@/types/player";
import type { PositionGroup } from "@/types/enums";
import {
  percentileRank,
  pedigreeScore,
  computeFitScore,
  undervaluation as undervalue,
  tierFromScore,
} from "@/lib/scoring";
import { db as mockDb } from "@/lib/mock-data";
import { ORG_ID } from "@/lib/constants";

function clean<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in row) out[k] = row[k] === null ? undefined : row[k];
  return out;
}

/** Position-aware production volume/quality from a CFBD metric bag. */
function productionRaw(group: PositionGroup, m: Record<string, number>): number {
  const g = (k: string) => m[k] ?? 0;
  switch (group) {
    case "QB":
      return g("passing.YDS") + g("passing.TD") * 25 + g("rushing.YDS") * 0.5 - g("passing.INT") * 15;
    case "RB":
      return g("rushing.YDS") + g("receiving.YDS") * 0.6 + (g("rushing.TD") + g("receiving.TD")) * 20;
    case "WR":
    case "TE":
      return g("receiving.YDS") + g("receiving.TD") * 20 + g("receiving.REC") * 2;
    case "DL":
      return g("defensive.TOT") + g("defensive.SACKS") * 15 + g("defensive.TFL") * 6 + g("defensive.QB HUR") * 3;
    case "LB":
      return g("defensive.TOT") + g("defensive.TFL") * 5 + g("defensive.SACKS") * 12 + g("defensive.PD") * 4;
    case "DB":
      return g("defensive.TOT") + g("defensive.PD") * 8 + g("defensive.TD") * 25 + g("fumbles.REC") * 10;
    default:
      return 0; // OL / ST — no box-score production from CFBD
  }
}

async function main() {
  console.log("→ Loading players, stats, needs…");
  const rows = await db.select().from(playersTbl);
  const players = rows.map((r) => PlayerSchema.parse(clean(r)));

  const statRows = await db.select().from(playerStatsTbl);
  const metricsByPlayer = new Map<string, Record<string, number>>();
  for (const s of statRows) metricsByPlayer.set(s.playerId, (s.metrics as Record<string, number>) ?? {});

  const needs = await db.select().from(teamNeedsTbl).where(eq(teamNeedsTbl.orgId, ORG_ID));
  const needByGroup = new Map<string, number>(needs.map((n) => [n.positionGroup, n.needScore]));

  const org = mockDb.org; // scheme-fit only reads org.defenseScheme (voided) — Maryland's profile

  // Group players to build per-group production + recruiting distributions.
  const byGroup = new Map<PositionGroup, Player[]>();
  for (const p of players) {
    if (!byGroup.has(p.positionGroup)) byGroup.set(p.positionGroup, []);
    byGroup.get(p.positionGroup)!.push(p);
  }

  const raws = new Map<string, number>();
  for (const p of players) raws.set(p.id, productionRaw(p.positionGroup, metricsByPlayer.get(p.id) ?? {}));

  const now = new Date().toISOString();
  let updated = 0;
  let undervalued = 0;
  const updates: { id: string; fit: number; prod: number; uv: number; need: number; tier: string }[] = [];

  for (const [group, groupPlayers] of byGroup) {
    // Production pool = only players who actually produced (raw > 0).
    const statPool = groupPlayers.map((p) => raws.get(p.id)!).filter((v) => v > 0);
    const hasAnyStats = statPool.length > 0;
    // Recruiting pool = pedigree of everyone in the group.
    const pedPool = groupPlayers.map((p) => pedigreeScore(p.compositeRating));

    for (const p of groupPlayers) {
      const raw = raws.get(p.id)!;
      const productionPercentile = raw > 0
        ? percentileRank(statPool, raw)
        : hasAnyStats
          ? 25 // had no box-score production in a group where others did
          : 50; // group has no CFBD production at all (OL/ST) — neutral
      const recruitingPercentile = percentileRank(pedPool, pedigreeScore(p.compositeRating));
      const uv = undervalue(productionPercentile, recruitingPercentile);
      const needScore = needByGroup.get(group) ?? 35;
      // Set production on the in-memory player so schemeFitScore sees real output.
      p.productionScore = Math.round(productionPercentile);
      const fit = computeFitScore(p, org, { needScore, productionPercentile });

      if (uv >= 20) undervalued++;
      updates.push({ id: p.id, fit, prod: Math.round(productionPercentile), uv, need: needScore, tier: tierFromScore(fit) });
      updated++;
    }
  }

  // Bulk apply in chunks (UPDATE ... FROM VALUES) — ~9 queries vs. 4,424.
  const CHUNK = 600;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    const rows = slice.map(
      (u) => sql`(${u.id}, ${u.fit}::double precision, ${u.prod}::double precision, ${u.uv}::double precision, ${u.need}::double precision, ${u.tier})`,
    );
    await db.execute(sql`
      UPDATE ${playersTbl} AS p SET
        fit_score = v.fit, production_score = v.prod, undervaluation = v.uv,
        need_score = v.need, consensus_tier = v.tier, consensus_grade = v.fit,
        computed_at = ${now}, updated_at = ${now}
      FROM (VALUES ${sql.join(rows, sql`, `)}) AS v(id, fit, prod, uv, need, tier)
      WHERE p.id = v.id`);
    console.log(`  …applied ${Math.min(i + CHUNK, updates.length)}/${updates.length}`);
  }

  const [{ avg }] = await db
    .select({ avg: sql<number>`round(avg(${playersTbl.fitScore}))` })
    .from(playersTbl);
  console.log(`\n✓ Scored ${updated} players. Avg fit ${avg}. Undervalued (uv>=20): ${undervalued}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
