# Portal Availability System (issue #1)

Makes a player's portal status **authoritative, auditable, explainable, and
consistent** everywhere in the app. A player can have a raw CFBD status, but
PortalIQ computes and displays one **effective** availability status.

## Precedence

The effective `portalStatus` is computed from three persisted layers, highest
wins:

1. **STAFF_OVERRIDE** — a coach manually set it. Authoritative until cleared.
2. **ROSTER_CHECK** — verified against an official roster / school source.
3. **CFBD** — the raw transfer-portal feed.
4. _(none)_ → **UNKNOWN** (treated as needing review, never silently "available").

The effective status drives the default Transfer Portal view, recommendations,
reports, dashboard counts, and recruiting-workflow warnings.

## Where the logic lives

- **`src/services/availability.service.ts`** — the single, pure domain layer.
  `computeEffectiveAvailability`, `applySignal` (reconciliation + idempotency),
  `availabilityPatch`, `getAvailabilityView` (UI projection), `OverrideInputSchema`
  (server-side validation). No DB, no React — reused by actions, ingest, and tests.
- **Persistence** — `players` table carries the effective columns plus the raw /
  verified / override layers; every change appends a row to **`status_events`**
  (append-only audit log). See `src/db/schema.ts` and migration
  `drizzle/0006_availability_layers.sql` (additive + backfill).
- **Atomic writes** — `PlayerRepository.commitAvailability` updates the player,
  syncs the active transfer entry (status + `statusHistory`), and inserts the
  audit event in **one transaction** (Postgres adapter) so they never drift.

## Reconciliation rules (enforced in `applySignal`)

- CFBD ingest updates the **raw** layer only; never overwrites an active override
  or a verified roster check's effect.
- A roster check supersedes CFBD but not an active override.
- A staff override stays authoritative until explicitly cleared/replaced.
- Clearing an override falls back to the strongest remaining source.
- Raw and effective are both preserved; the UI shows *why* they differ.
- Stale/unverified states are surfaced (`reviewState`: VERIFIED | UNVERIFIED | STALE)
  rather than silently assuming the player is available.

## CFBD ingest integration

- `scripts/ingest/map.ts` writes the raw CFBD status + `rawStatusUpdatedAt` and
  resolves effective via the service for fresh entries.
- `scripts/ingest/run.ts` (`npm run ingest:portal`) upserts players preserving
  the managed availability columns whenever the row is owned by `STAFF_OVERRIDE`
  or `ROSTER_CHECK` (precedence expressed in SQL), refreshes the raw layer, then
  runs an audit pass that appends a `status_events` row **only on meaningful
  change** and re-syncs the active transfer entry. Idempotent: an unchanged
  rerun emits nothing.
- `scripts/ingest/availability.ts` (`AVAIL_YEAR=2026 ...`) records official-roster
  corrections as ROSTER_CHECK signals through the same service + transactional
  repository path.

### To run against a live database

1. `npm run db:migrate` (or `db:push`) to apply `0006_availability_layers.sql`
   (additive columns + `status_events` table + backfill of existing rows).
2. Set `DATABASE_URL` (+ `CFBD_API_KEY`) and `NEXT_PUBLIC_DATA_BACKEND=postgres`.
3. `npm run ingest:portal`, then optionally `npm run check:availability`.

## Verification

`npm test` (node:test) covers precedence, override-clear fallback, ingest
no-clobber, effective/transfer/history sync, default-pool exclusion, intentional
filter inclusion, server-side empty-note rejection, idempotent ingest, and the
raw/effective conflict surfaced in the domain response.
