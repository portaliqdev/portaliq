/**
 * Availability cross-check — corrects the CFBD portal feed against official
 * rosters (a legal, public source). A player CFBD still lists "in portal" who
 * appears on a next-season roster has actually resolved:
 *   - on his ORIGIN school's roster  → withdrew / returned   → WITHDRAWN
 *   - on a DIFFERENT school's roster → committed / enrolled   → COMMITTED
 *
 *   npm run check:availability            # uses CURRENT_SEASON
 *   AVAIL_YEAR=2026 npm run check:availability
 *
 * Staff overrides (STAFF_OVERRIDE) are never touched. Note: CFBD does not
 * publish a season's rosters until ~fall camp, so before then this finds 0 and
 * manual staff override is the live correction path.
 */
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { players as playersTbl } from "@/db/schema";
import { PlayerSchema } from "@/types/player";
import { CURRENT_SEASON } from "@/lib/constants";
import { slug } from "./map";

const YEAR = Number(process.env.AVAIL_YEAR ?? CURRENT_SEASON);
const BASE = "https://api.collegefootballdata.com";

interface RosterRow { firstName: string; lastName: string; team: string }

function clean<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in row) out[k] = row[k] === null ? undefined : row[k];
  return out;
}

async function main() {
  console.log(`→ Fetching ${YEAR} rosters for cross-check…`);
  const res = await fetch(`${BASE}/roster?year=${YEAR}`, {
    headers: { Authorization: `Bearer ${process.env.CFBD_API_KEY}`, Accept: "application/json" },
  });
  const roster = (await res.json()) as RosterRow[];
  if (!Array.isArray(roster) || roster.length === 0) {
    console.log(`  ⚠ CFBD has no ${YEAR} roster data yet (published ~fall camp). Cross-check found nothing to correct.`);
    console.log("  Until then, use the in-app staff override to mark stale players unavailable.");
    process.exit(0);
  }
  // name slug → set of teams the player appears on in YEAR.
  const teamsByName = new Map<string, Set<string>>();
  for (const r of roster) {
    const k = slug(`${r.firstName} ${r.lastName}`);
    if (!teamsByName.has(k)) teamsByName.set(k, new Set());
    teamsByName.get(k)!.add(r.team);
  }
  console.log(`  ${roster.length} roster rows across ${new Set(roster.map((r) => r.team)).size} teams.`);

  // Only re-check players CFBD still calls available, excluding staff overrides.
  const rows = await db
    .select()
    .from(playersTbl)
    .where(and(eq(playersTbl.portalStatus, "IN_PORTAL"), ne(playersTbl.statusSource, "STAFF_OVERRIDE")));
  const candidates = rows.map((r) => PlayerSchema.parse(clean(r)));
  console.log(`→ Cross-checking ${candidates.length} IN_PORTAL players…`);

  const now = new Date().toISOString();
  let withdrew = 0;
  let committed = 0;

  for (const p of candidates) {
    const teams = teamsByName.get(slug(p.fullName));
    if (!teams || teams.size === 0) continue;
    const origin = p.currentSchool.name;
    let status: "WITHDRAWN" | "COMMITTED";
    let note: string;
    if (teams.has(origin)) {
      status = "WITHDRAWN";
      note = `On ${origin}'s ${YEAR} roster — withdrew/returned (CFBD feed stale).`;
      withdrew++;
    } else {
      const dest = [...teams][0];
      status = "COMMITTED";
      note = `On ${dest}'s ${YEAR} roster — committed/enrolled (CFBD feed stale).`;
      committed++;
    }
    await db
      .update(playersTbl)
      .set({ portalStatus: status, statusSource: "ROSTER_CHECK", availabilityCheckedAt: now, statusNote: note, updatedAt: now })
      .where(eq(playersTbl.id, p.id));
  }

  console.log(`\n✓ Cross-check complete — ${withdrew} returned (withdrawn), ${committed} committed elsewhere; ${candidates.length - withdrew - committed} still available.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
