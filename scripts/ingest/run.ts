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
import { getTableColumns, getTableName, sql, eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  schools as schoolsTbl,
  players as playersTbl,
  transferEntries as transferTbl,
  statusEvents as statusEventsTbl,
} from "@/db/schema";
import { PlayerSchema, type Player } from "@/types/player";
import { TransferEntrySchema } from "@/types/stats";
import { SchoolSchema } from "@/types/school";
import { CURRENT_SEASON } from "@/lib/constants";
import { getFbsTeams, getPortal } from "./cfbd-client";
import { SchoolDirectory, mapPortalEntry } from "./map";

const PORTAL_YEAR = 2026;
const TEAMS_YEAR = 2025; // FBS directory; conferences stable enough for resolution
const CHUNK = 500;

/**
 * Effective/verified/override availability columns. On re-ingest these are
 * PRESERVED for any row already owned by a staff override or roster check — CFBD
 * only ever writes the raw_* layer. The availability service recomputes the
 * effective columns for CFBD-owned rows via the mapped values (see map.ts), so
 * preserving them here is exactly the precedence rule expressed in SQL:
 *   STAFF_OVERRIDE / ROSTER_CHECK win; CFBD follows the feed.
 */
const MANAGED_AVAILABILITY_COLS = [
  "portalStatus",
  "statusSource",
  "statusReviewState",
  "statusNote",
  "statusEvidenceUrl",
  "availabilityCheckedAt",
  "verifiedPortalStatus",
  "verifiedAt",
  "verifiedNote",
  "verifiedEvidenceUrl",
  "overridePortalStatus",
  "overrideAt",
  "overrideNote",
  "overrideEvidenceUrl",
  "overrideActorId",
  "overrideActorName",
];
/** Transfer columns the staff/availability path owns — never clobbered by CFBD. */
const MANAGED_TRANSFER_COLS = [
  "status",
  "statusHistory",
  "committedAt",
  "withdrawnAt",
  "enrolledAt",
];

/**
 * Build an "update every column except id" set for ON CONFLICT (idempotent
 * upsert). `manageBy`, when given, makes the listed columns keep their EXISTING
 * value whenever the row is owned by a non-CFBD source — so re-ingesting CFBD
 * never clobbers a staff override or verified roster check.
 */
function upsertAllExceptId<T extends PgTable>(
  table: T,
  opts: { managedCols?: string[]; ownerColumn?: string } = {},
) {
  const { managedCols = [], ownerColumn } = opts;
  const cols = getTableColumns(table);
  const tname = getTableName(table);
  const set: Record<string, unknown> = {};
  for (const [name, col] of Object.entries(cols)) {
    if (name === "id") continue;
    const dbCol = sql.identifier((col as { name: string }).name);
    const existing = sql`${sql.identifier(tname)}.${dbCol}`;
    if (managedCols.includes(name)) {
      // With an owner column: keep existing only when a non-CFBD source owns the
      // row. Without one: always keep existing (the audit pass syncs it).
      set[name] = ownerColumn
        ? sql`CASE WHEN ${sql.identifier(tname)}.${sql.identifier(ownerColumn)} IN ('STAFF_OVERRIDE','ROSTER_CHECK') THEN ${existing} ELSE excluded.${dbCol} END`
        : existing;
    } else {
      set[name] = sql`excluded.${dbCol}`;
    }
  }
  return set;
}

/** Keep the last row per id — a single insert batch can't touch a row twice. */
function dedupeById(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byId = new Map<unknown, Record<string, unknown>>();
  for (const r of rows) byId.set(r.id, r);
  return [...byId.values()];
}

async function upsertChunked<T extends PgTable>(
  table: T,
  rows: Record<string, unknown>[],
  opts: { managedCols?: string[]; ownerColumn?: string } = {},
) {
  rows = dedupeById(rows);
  if (rows.length === 0) return;
  const set = upsertAllExceptId(table, opts);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    // @ts-expect-error drizzle's generic insert value typing vs. our validated rows
    await db.insert(table).values(slice).onConflictDoUpdate({ target: (table as { id: unknown }).id, set });
  }
}

interface PriorAvail {
  portalStatus: string | null;
  statusSource: string | null;
  statusReviewState: string | null;
  rawPortalStatus: string | null;
}

async function loadPriorAvailability(): Promise<Map<string, PriorAvail>> {
  const rows = await db
    .select({
      id: playersTbl.id,
      portalStatus: playersTbl.portalStatus,
      statusSource: playersTbl.statusSource,
      statusReviewState: playersTbl.statusReviewState,
      rawPortalStatus: playersTbl.rawPortalStatus,
    })
    .from(playersTbl);
  return new Map(rows.map((r) => [r.id, r]));
}

/**
 * Append an audit event for every player whose raw or effective status changed
 * this run, and re-sync the active transfer entry for CFBD-owned rows whose
 * effective status moved. Idempotent: an unchanged rerun emits nothing.
 */
async function syncAvailabilityAudit(
  prior: Map<string, PriorAvail>,
  mapped: Player[],
): Promise<{ events: number; synced: number }> {
  const now = new Date().toISOString();
  const runTs = Date.now().toString(36);
  const events: (typeof statusEventsTbl.$inferInsert)[] = [];
  let synced = 0;

  for (const m of mapped) {
    const prev = prior.get(m.id);
    const managed =
      prev?.statusSource === "STAFF_OVERRIDE" || prev?.statusSource === "ROSTER_CHECK";
    const newRaw = m.rawPortalStatus ?? null;
    const effStatus = managed ? prev!.portalStatus : m.portalStatus ?? null;
    const effSource = managed ? prev!.statusSource : m.statusSource ?? "CFBD";
    const effReview = managed ? prev!.statusReviewState : m.statusReviewState ?? null;
    const rawChanged = !prev || prev.rawPortalStatus !== newRaw;
    const effChanged = !prev || prev.portalStatus !== effStatus;

    if (!prev || rawChanged || effChanged) {
      events.push({
        id: `se_${m.id}_${runTs}`,
        orgId: m.orgId,
        playerId: m.id,
        transferEntryId: `te_${m.id}`,
        rawStatus: newRaw,
        effectiveStatus: effStatus,
        source: effSource,
        reviewState: effReview,
        note: !prev
          ? "Entered the transfer portal (CFBD feed)."
          : managed
            ? "CFBD feed refreshed; staff/verified status retained."
            : "Effective status updated from the CFBD feed.",
        createdAt: now,
      } as typeof statusEventsTbl.$inferInsert);
    }

    // CFBD-owned rows whose effective status moved: bring the active transfer
    // entry along and append a history row.
    if (!managed && effChanged && prev && effStatus) {
      const historyRow = JSON.stringify([{ status: effStatus, at: now, source: "CFBD" }]);
      await db
        .update(transferTbl)
        .set({
          status: effStatus,
          statusHistory: sql`coalesce(${transferTbl.statusHistory}, '[]'::jsonb) || ${historyRow}::jsonb`,
          updatedAt: now,
        })
        .where(eq(transferTbl.id, `te_${m.id}`));
      synced++;
    }
  }

  for (let i = 0; i < events.length; i += CHUNK) {
    await db.insert(statusEventsTbl).values(events.slice(i, i + CHUNK)).onConflictDoNothing();
  }
  return { events: events.length, synced };
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

  // Snapshot prior availability BEFORE upsert so we can emit audit events only
  // for meaningful changes (and never duplicate on idempotent reruns).
  const prior = await loadPriorAvailability();

  // Schools must land before players (referenced by currentSchoolId).
  const schools = dir.all().map((s) => SchoolSchema.parse(s));
  console.log(`→ Upserting ${schools.length} schools…`);
  await upsertChunked(schoolsTbl, schools as Record<string, unknown>[]);

  // Players: CFBD refreshes the raw_* layer + profile; staff overrides and
  // verified roster checks keep their effective columns (precedence in SQL).
  console.log(`→ Upserting ${players.length} players…`);
  await upsertChunked(playersTbl, players as Record<string, unknown>[], {
    managedCols: MANAGED_AVAILABILITY_COLS,
    ownerColumn: "status_source",
  });

  // Transfers: keep the staff/availability-owned status + history; the audit
  // pass below re-syncs the active entry when the effective status moves.
  console.log(`→ Upserting ${transfers.length} transfer entries…`);
  await upsertChunked(transferTbl, transfers as Record<string, unknown>[], {
    managedCols: MANAGED_TRANSFER_COLS,
  });

  const audited = await syncAvailabilityAudit(prior, players as Player[]);
  console.log(`→ Availability audit: ${audited.events} event(s), ${audited.synced} transfer(s) re-synced.`);

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
