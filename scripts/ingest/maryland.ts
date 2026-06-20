/**
 * Ingest Maryland's own roster (the org-workflow plane) so Team Needs runs on
 * real data instead of mock.
 *
 *   npm run ingest:maryland
 *
 *   /roster?team=Maryland&year=2025   → depth-chart slots
 *   /stats/player/season (Maryland)   → per-player production (starter/depth rank)
 *   transfer_entries (from Maryland)   → real departures
 *
 * Produces roster_slots + roster_snapshots + base team_needs rows (depth math).
 * The needScore / priority / notes are left for the AI pass (npm run ai:needs).
 */
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { rosterSlots as slotsTbl, rosterSnapshots as snapTbl, teamNeeds as needsTbl, transferEntries as transferTbl } from "@/db/schema";
import { RosterSlotSchema, RosterSnapshotSchema, PositionNeedSchema } from "@/types/team-needs";
import type { PositionCode, PositionGroup, EligibilityClass } from "@/types/enums";
import { ORG_ID } from "@/lib/constants";
import { slug } from "./map";

const TEAM = "Maryland";
const SEASON = 2025;
const BASE = "https://api.collegefootballdata.com";

/** CFBD roster group → a canonical position room (code, group, ideal depth, starters). */
// ideal = scholarship allocation per position room (sums to ~85, the FBS limit),
// so "ideal − returning" yields a credible depth gap / open-scholarship count.
const ROOM: Record<string, { code: PositionCode; group: PositionGroup; ideal: number; starters: number }> = {
  QB: { code: "QB", group: "QB", ideal: 4, starters: 1 },
  RB: { code: "RB", group: "RB", ideal: 5, starters: 1 },
  WR: { code: "WR", group: "WR", ideal: 12, starters: 3 },
  TE: { code: "TE", group: "TE", ideal: 5, starters: 1 },
  OL: { code: "OT", group: "OL", ideal: 16, starters: 5 },
  DL: { code: "DT", group: "DL", ideal: 15, starters: 4 },
  LB: { code: "LB", group: "LB", ideal: 9, starters: 3 },
  DB: { code: "CB", group: "DB", ideal: 16, starters: 4 },
  PK: { code: "K", group: "ST", ideal: 1, starters: 1 },
  P: { code: "P", group: "ST", ideal: 1, starters: 1 },
  LS: { code: "LS", group: "ST", ideal: 1, starters: 1 },
};
const SCHOLARSHIP_LIMIT = 85;

interface RosterRow {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  year: number | null;
}
interface StatRow { playerId: string; category: string; statType: string; stat: string | number }

async function cfbd<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${process.env.CFBD_API_KEY}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CFBD ${path} → ${res.status}`);
  return (await res.json()) as T;
}

function elig(year: number | null): { cls: EligibilityClass; yearsRemaining: number; graduating: boolean } {
  const y = year ?? 3;
  const cls = (["FR", "SO", "JR", "SR", "GR"][Math.min(Math.max(y, 1), 5) - 1] ?? "JR") as EligibilityClass;
  return { cls, yearsRemaining: Math.max(0, 4 - Math.min(Math.max(y - 1, 0), 4)), graduating: y >= 5 };
}

/** Position-relevant production proxy for depth ranking. */
function proxy(code: PositionCode, m: Record<string, number>): number {
  switch (code) {
    case "QB": return m["passing.YDS"] ?? 0;
    case "RB": return m["rushing.YDS"] ?? 0;
    case "WR":
    case "TE": return m["receiving.YDS"] ?? 0;
    case "DT":
    case "LB":
    case "CB": return m["defensive.TOT"] ?? 0;
    default: return 0;
  }
}

async function main() {
  console.log(`→ Fetching ${TEAM} roster + stats (${SEASON})…`);
  const [roster, stats, departures] = await Promise.all([
    cfbd<RosterRow[]>("/roster", { team: TEAM, year: SEASON }),
    cfbd<StatRow[]>("/stats/player/season", { team: TEAM, year: SEASON }),
    db.select({ name: transferTbl.fromSchoolName, pid: transferTbl.playerId }).from(transferTbl).where(eq(transferTbl.fromSchoolName, TEAM)),
  ]);

  // metrics by CFBD id
  const metricsById = new Map<string, Record<string, number>>();
  for (const s of stats) {
    const n = Number(s.stat);
    if (!Number.isFinite(n)) continue;
    const bag = metricsById.get(s.playerId) ?? {};
    bag[`${s.category}.${s.statType}`] = n;
    metricsById.set(s.playerId, bag);
  }
  // Departures matched back to roster by name (the portal player ids carry the name slug).
  const departedSlugs = new Set(departures.map((d) => d.pid.replace(/^player_/, "").replace(/-maryland-.*$/, "")));
  console.log(`  ${roster.length} players, ${departures.length} portal departures.`);

  // Group roster into rooms.
  interface Slot { name: string; code: PositionCode; group: PositionGroup; cls: EligibilityClass; yearsRemaining: number; departing: boolean; starterProxy: number }
  const rooms = new Map<PositionCode, { def: typeof ROOM[string]; slots: Slot[] }>();

  for (const r of roster) {
    const room = ROOM[(r.position ?? "").toUpperCase()];
    if (!room) continue;
    const e = elig(r.year);
    const nameSlug = slug(`${r.firstName}-${r.lastName}`);
    const inPortal = [...departedSlugs].some((d) => d.startsWith(nameSlug));
    const departing = inPortal || e.graduating;
    const slot: Slot = {
      name: `${r.firstName} ${r.lastName}`,
      code: room.code,
      group: room.group,
      cls: e.cls,
      yearsRemaining: e.yearsRemaining,
      departing,
      starterProxy: proxy(room.code, metricsById.get(r.id) ?? {}),
    };
    if (!rooms.has(room.code)) rooms.set(room.code, { def: room, slots: [] });
    rooms.get(room.code)!.slots.push(slot);
  }

  const now = new Date().toISOString();
  const slotRows: unknown[] = [];
  const needRows: unknown[] = [];

  for (const [code, { def, slots }] of rooms) {
    // Returning first, then by production proxy → depth rank + starter flag.
    slots.sort((a, b) => Number(a.departing) - Number(b.departing) || b.starterProxy - a.starterProxy);
    const returning = slots.filter((s) => !s.departing);
    const departures = slots.filter((s) => s.departing).length;

    slots.forEach((s, i) => {
      slotRows.push(
        RosterSlotSchema.parse({
          id: `slot_${ORG_ID}_${code}_${i}`,
          orgId: ORG_ID,
          playerName: s.name,
          position: s.code,
          positionGroup: s.group,
          depthRank: i + 1,
          eligibilityClass: s.cls,
          yearsRemaining: s.yearsRemaining,
          scholarshipStatus: "SCHOLARSHIP",
          departureRisk: s.departing ? "HIGH" : s.yearsRemaining <= 1 ? "MED" : "LOW",
          starter: !s.departing && i < def.starters,
          projectedGrade: s.starterProxy > 0 ? Math.min(99, 50 + Math.round(s.starterProxy / 40)) : undefined,
        }),
      );
    });

    const projectedReturning = returning.length;
    needRows.push(
      PositionNeedSchema.parse({
        id: `need_${ORG_ID}_${code}`,
        orgId: ORG_ID,
        seasonYear: SEASON + 1,
        position: code,
        positionGroup: def.group,
        idealDepth: def.ideal,
        currentDepth: slots.length,
        projectedDepartures: departures,
        incomingCommits: 0,
        projectedReturning,
        needScore: 0, // AI fills (npm run ai:needs)
        priority: "NONE",
        availableScholarships: Math.max(0, def.ideal - projectedReturning),
        starterReturning: returning.some((s, i) => i < def.starters),
        computedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  // Open scholarships = sum of per-room gaps; used = limit − open (≤ limit).
  const openScholarships = (needRows as { availableScholarships?: number }[]).reduce(
    (sum, n) => sum + (n.availableScholarships ?? 0),
    0,
  );
  const scholarshipCount = Math.max(0, Math.min(SCHOLARSHIP_LIMIT, SCHOLARSHIP_LIMIT - openScholarships));

  const snapshot = RosterSnapshotSchema.parse({
    id: `roster_${ORG_ID}_${SEASON}`,
    orgId: ORG_ID,
    seasonYear: SEASON,
    asOf: now,
    label: `${TEAM} ${SEASON} post-season`,
    slots: [],
    scholarshipCount,
    rosterCount: roster.length,
    scholarshipLimit: SCHOLARSHIP_LIMIT,
    rosterLimit: 105,
    createdAt: now,
    updatedAt: now,
  });

  // Replace prior Maryland roster/needs (idempotent re-run).
  await db.delete(slotsTbl).where(eq(slotsTbl.orgId, ORG_ID));
  await db.delete(needsTbl).where(eq(needsTbl.orgId, ORG_ID));
  await db.delete(snapTbl).where(eq(snapTbl.orgId, ORG_ID));

  // @ts-expect-error validated rows vs. drizzle generics
  await db.insert(slotsTbl).values(slotRows);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { slots: _omit, ...snapRow } = snapshot as any;
  await db.insert(snapTbl).values(snapRow);
  // @ts-expect-error validated rows vs. drizzle generics
  await db.insert(needsTbl).values(needRows);

  console.log(`\n✓ Maryland roster ingested`);
  console.log(`  ${slotRows.length} roster slots across ${rooms.size} position rooms, ${needRows.length} need rows.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
