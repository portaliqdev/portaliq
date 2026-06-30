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
 * Each correction is recorded as a ROSTER_CHECK signal through the availability
 * service: it supersedes CFBD but never an active STAFF_OVERRIDE, syncs the
 * transfer entry, and appends a status_events audit row — all transactionally.
 * Note: CFBD doesn't publish a season's rosters until ~fall camp, so before then
 * this finds 0 and manual staff override is the live correction path.
 */
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { players as playersTbl } from "@/db/schema";
import { PlayerSchema } from "@/types/player";
import { CURRENT_SEASON } from "@/lib/constants";
import { createPostgresRepositories } from "@/adapters/postgres";
import {
  applySignal,
  playerToAvailabilityState,
  availabilityPatch,
} from "@/services/availability.service";
import type { PortalStatus } from "@/types/enums";
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
  const repos = createPostgresRepositories();
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

  // Only re-check players the EFFECTIVE status still calls available, excluding
  // staff overrides (a roster check never supersedes a coach's manual call).
  const rows = await db
    .select()
    .from(playersTbl)
    .where(and(eq(playersTbl.portalStatus, "IN_PORTAL"), ne(playersTbl.statusSource, "STAFF_OVERRIDE")));
  const candidates = rows.map((r) => PlayerSchema.parse(clean(r)));
  console.log(`→ Cross-checking ${candidates.length} IN_PORTAL players…`);

  const now = new Date().toISOString();
  let withdrew = 0;
  let committed = 0;
  let unchanged = 0;

  for (const player of candidates) {
    const teams = teamsByName.get(slug(player.fullName));
    if (!teams || teams.size === 0) continue;
    const origin = player.currentSchool.name;
    let status: PortalStatus;
    let note: string;
    if (teams.has(origin)) {
      status = "WITHDRAWN";
      note = `On ${origin}'s ${YEAR} roster — withdrew/returned (CFBD feed stale).`;
    } else {
      const dest = [...teams][0];
      status = "COMMITTED";
      note = `On ${dest}'s ${YEAR} roster — committed/enrolled (CFBD feed stale).`;
    }

    const { next, effective, changed } = applySignal(
      playerToAvailabilityState(player),
      { kind: "ROSTER_CHECK", status, at: now, note },
      Date.parse(now),
    );
    if (!changed) {
      unchanged++;
      continue;
    }
    if (status === "WITHDRAWN") withdrew++;
    else committed++;
    await repos.players.commitAvailability(player.id, {
      patch: availabilityPatch(next, effective, now),
      effectiveStatus: effective.status,
      event: {
        rawStatus: effective.rawStatus,
        effectiveStatus: effective.status,
        source: effective.source,
        reviewState: effective.reviewState,
        note: effective.note,
        evidenceUrl: effective.evidenceUrl,
      },
    });
  }

  console.log(
    `\n✓ Cross-check complete — ${withdrew} returned (withdrawn), ${committed} committed elsewhere; ${unchanged} already current; ${candidates.length - withdrew - committed - unchanged} still available.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
