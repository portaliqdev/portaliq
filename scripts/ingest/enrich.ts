/**
 * Phase 2.5 — enrich ingested portal players with roster measurables + season
 * production. Both feeds key off CFBD player id, so:
 *   /roster?year=2025      → height, weight, class (eligibility), jersey, hometown
 *   /stats/player/season   → per-player metric bag → player_stats rows
 *
 * Join: portal player (full name + origin school) → roster row (name + team).
 * Roster row carries the CFBD id, which then keys the stats join.
 *
 *   npm run ingest:enrich
 */
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { players as playersTbl, playerStats as playerStatsTbl } from "@/db/schema";
import { PlayerStatsSchema } from "@/types/stats";
import type { EligibilityClass } from "@/types/enums";
import type { EligibilityBlock } from "@/types/player";
import { ORG_ID } from "@/lib/constants";
import { slug } from "./map";

const ROSTER_YEAR = 2025;
const STATS_YEAR = 2025;
const CONCURRENCY = 25;
const BASE = "https://api.collegefootballdata.com";

interface RosterRow {
  id: string;
  firstName: string;
  lastName: string;
  team: string;
  position: string | null;
  height: number | null;
  weight: number | null;
  jersey: number | null;
  year: number | null; // class 1-5
  homeCity: string | null;
  homeState: string | null;
}
interface StatRow {
  playerId: string;
  category: string;
  statType: string;
  stat: string | number;
}

async function cfbd<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${process.env.CFBD_API_KEY}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CFBD ${path} → ${res.status}`);
  return (await res.json()) as T;
}

/** CFBD class year (1-5) → eligibility class + a derived eligibility block. */
function eligibilityFromYear(year: number | null): { cls: EligibilityClass; block: EligibilityBlock } {
  const y = year ?? 3;
  const cls: EligibilityClass = (["FR", "SO", "JR", "SR", "GR"][Math.min(Math.max(y, 1), 5) - 1] ??
    "JR") as EligibilityClass;
  const seasonsUsed = Math.min(Math.max(y - 1, 0), 4);
  return {
    cls,
    block: {
      seasonsAllowed: 4,
      seasonsUsed,
      redshirtUsed: false,
      extraYears: 0,
      yearsRemaining: Math.max(0, 4 - seasonsUsed),
      isGraduate: y >= 5,
    },
  };
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const idx = i++;
        await worker(items[idx]);
      }
    }),
  );
}

async function main() {
  console.log(`→ Fetching roster (${ROSTER_YEAR})…`);
  const roster = await cfbd<RosterRow[]>("/roster", { year: ROSTER_YEAR });
  const rosterByKey = new Map<string, RosterRow>();
  for (const r of roster) {
    rosterByKey.set(`${slug(`${r.firstName} ${r.lastName}`)}|${slug(r.team)}`, r);
  }
  console.log(`  ${roster.length} roster rows.`);

  console.log(`→ Fetching season stats (${STATS_YEAR})…`);
  const stats = await cfbd<StatRow[]>("/stats/player/season", { year: STATS_YEAR });
  const metricsByCfbdId = new Map<string, Record<string, number>>();
  for (const s of stats) {
    const n = Number(s.stat);
    if (!Number.isFinite(n)) continue;
    const bag = metricsByCfbdId.get(s.playerId) ?? {};
    bag[`${s.category}.${s.statType}`] = n;
    metricsByCfbdId.set(s.playerId, bag);
  }
  console.log(`  ${stats.length} stat rows → ${metricsByCfbdId.size} players with stats.`);

  // Pull the ingested portal players to match against.
  const portalPlayers = await db
    .select({
      id: playersTbl.id,
      fullName: playersTbl.fullName,
      schoolName: playersTbl.currentSchool,
      schoolId: playersTbl.currentSchoolId,
      position: playersTbl.primaryPosition,
    })
    .from(playersTbl);
  console.log(`→ Matching ${portalPlayers.length} portal players…`);

  let measured = 0;
  let withStats = 0;
  const now = new Date().toISOString();
  const statRows: unknown[] = [];

  await runPool(portalPlayers, async (p) => {
    const teamName = (p.schoolName as { name: string }).name;
    const r = rosterByKey.get(`${slug(p.fullName)}|${slug(teamName)}`);
    if (!r) return;

    const { cls, block } = eligibilityFromYear(r.year);
    await db
      .update(playersTbl)
      .set({
        heightInches: r.height ?? 0,
        weightLbs: r.weight ?? 0,
        jerseyNumber: r.jersey ?? undefined,
        eligibilityClass: cls,
        eligibility: block,
        hometown: r.homeCity ?? undefined,
        homeState: r.homeState ?? undefined,
        updatedAt: now,
      })
      .where(eq(playersTbl.id, p.id));
    measured++;

    const metrics = metricsByCfbdId.get(r.id);
    if (metrics && Object.keys(metrics).length > 0) {
      const row = {
        id: `stats_${p.id}_${STATS_YEAR}`,
        orgId: ORG_ID,
        playerId: p.id,
        seasonYear: STATS_YEAR,
        schoolId: p.schoolId,
        schoolName: teamName,
        position: p.position,
        gamesPlayed: Math.round(metrics["games.GP"] ?? metrics["general.GP"] ?? 0),
        metrics,
        source: "cfbd",
        verified: true,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = PlayerStatsSchema.safeParse(row);
      if (parsed.success) {
        statRows.push(parsed.data);
        withStats++;
      }
    }
  });

  // Upsert collected stats rows.
  if (statRows.length) {
    const CHUNK = 500;
    for (let i = 0; i < statRows.length; i += CHUNK) {
      await db
        .insert(playerStatsTbl)
        // @ts-expect-error validated rows vs. drizzle insert generic
        .values(statRows.slice(i, i + CHUNK))
        .onConflictDoNothing();
    }
  }

  console.log("\n✓ Enrichment complete");
  console.log(`  measurables matched: ${measured} / ${portalPlayers.length}`);
  console.log(`  players with season stats: ${withStats}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
