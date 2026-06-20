/**
 * Transfer-portal ingest — 2026 cycle (the window feeding the 2026 season).
 *
 *   npm run ingest:portal
 *
 * Pipeline: CFBD /teams/fbs (school directory) + /player/portal?year=2026
 *   → map → Zod-validate (the gate that kills "messy data")
 *   → idempotent upsert into Neon (schools, players, transfer_entries).
 *
 * Re-runnable: conflicts on id update in place, so the same cycle can be
 * refreshed without dupes.
 */
import { getTableColumns, getTableName, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { schools as schoolsTbl, players as playersTbl, transferEntries as transferTbl } from "@/db/schema";
import { PlayerSchema } from "@/types/player";
import { TransferEntrySchema } from "@/types/stats";
import { SchoolSchema } from "@/types/school";
import { CURRENT_SEASON } from "@/lib/constants";
import { getFbsTeams, getPortal } from "./cfbd-client";
import { SchoolDirectory, mapPortalEntry } from "./map";

const PORTAL_YEAR = 2026;
const TEAMS_YEAR = 2025; // FBS directory; conferences stable enough for resolution
const CHUNK = 500;

/**
 * Build an "update every column except id" set for ON CONFLICT (idempotent
 * upsert). Columns in `preserveOnOverride` keep the EXISTING value when the row
 * was set by a staff override — so re-ingesting CFBD never clobbers a coach's
 * manual availability correction.
 */
function upsertAllExceptId<T extends PgTable>(table: T, preserveOnOverride: string[] = []) {
  const cols = getTableColumns(table);
  const tname = getTableName(table);
  const set: Record<string, unknown> = {};
  for (const [name, col] of Object.entries(cols)) {
    if (name === "id") continue;
    const dbCol = sql.identifier((col as { name: string }).name);
    set[name] = preserveOnOverride.includes(name)
      ? sql`CASE WHEN ${sql.identifier(tname)}.status_source = 'STAFF_OVERRIDE' THEN ${sql.identifier(tname)}.${dbCol} ELSE excluded.${dbCol} END`
      : sql`excluded.${dbCol}`;
  }
  return set;
}

/** Keep the last row per id — a single insert batch can't touch a row twice. */
function dedupeById(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byId = new Map<unknown, Record<string, unknown>>();
  for (const r of rows) byId.set(r.id, r);
  return [...byId.values()];
}

async function upsertChunked<T extends PgTable>(table: T, rows: Record<string, unknown>[]) {
  rows = dedupeById(rows);
  if (rows.length === 0) return;
  const set = upsertAllExceptId(table);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    // @ts-expect-error drizzle's generic insert value typing vs. our validated rows
    await db.insert(table).values(slice).onConflictDoUpdate({ target: (table as { id: unknown }).id, set });
  }
}

async function main() {
  console.log(`→ Fetching FBS team directory (${TEAMS_YEAR})…`);
  const teams = await getFbsTeams(TEAMS_YEAR);
  const dir = new SchoolDirectory(teams);
  console.log(`  ${teams.length} FBS teams loaded.`);

  console.log(`→ Fetching transfer portal (year=${PORTAL_YEAR})…`);
  const entries = await getPortal(PORTAL_YEAR);
  console.log(`  ${entries.length} portal entries.`);

  const players: unknown[] = [];
  const transfers: unknown[] = [];
  let skipped = 0;
  const errors: string[] = [];

  for (const e of entries) {
    const mapped = mapPortalEntry(e, dir);
    if (!mapped) {
      skipped++;
      continue;
    }
    // Validation gate — anything malformed is reported, not silently stored.
    const p = PlayerSchema.safeParse(mapped.player);
    const t = TransferEntrySchema.safeParse(mapped.transfer);
    if (!p.success || !t.success) {
      if (errors.length < 5) {
        const issue = (!p.success ? p.error : t.error)?.issues[0]?.message ?? "unknown";
        errors.push(`${e.firstName} ${e.lastName}: ${issue}`);
      }
      skipped++;
      continue;
    }
    players.push(p.data);
    transfers.push(t.data);
  }

  // Schools must land before players (referenced by currentSchoolId).
  const schools = dir.all().map((s) => SchoolSchema.parse(s));
  console.log(`→ Upserting ${schools.length} schools…`);
  await upsertChunked(schoolsTbl, schools as Record<string, unknown>[]);

  console.log(`→ Upserting ${players.length} players…`);
  await upsertChunked(playersTbl, players as Record<string, unknown>[]);

  console.log(`→ Upserting ${transfers.length} transfer entries…`);
  await upsertChunked(transferTbl, transfers as Record<string, unknown>[]);

  console.log("\n✓ Ingest complete");
  console.log(`  season ${CURRENT_SEASON} portal cycle`);
  console.log(`  schools: ${schools.length}  players: ${players.length}  transfers: ${transfers.length}  skipped: ${skipped}`);
  if (errors.length) console.log(`  sample validation errors:\n   - ${errors.join("\n   - ")}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
