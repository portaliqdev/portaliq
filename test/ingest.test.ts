import { test } from "node:test";
import assert from "node:assert/strict";

import { db } from "@/lib/mock-data";
import { MockPlayerRepository } from "@/adapters/mock";
import {
  applySignal,
  availabilityPatch,
  playerToAvailabilityState,
} from "@/services/availability.service";
import type { Player } from "@/types/player";
import type { TransferEntry } from "@/types/stats";

const repo = new MockPlayerRepository();
const now = new Date().toISOString();

/** Create a fresh player (effective IN_PORTAL via CFBD) with a unique id. */
async function makePlayer(tag: string): Promise<Player> {
  const base = db.players[0];
  const { id: _drop, ...rest } = base;
  return repo.create({
    ...rest,
    fullName: `Test Player ${tag}`,
    portalStatus: "IN_PORTAL",
    statusSource: "CFBD",
    rawPortalStatus: "IN_PORTAL",
    rawStatusUpdatedAt: now,
    // wipe any higher layers from the cloned seed
    verifiedPortalStatus: undefined,
    overridePortalStatus: undefined,
  } as Omit<Player, "id">);
}

/** Push an active transfer entry (IN_PORTAL) for the player with matching id. */
function makeTransferEntry(player: Player, tag: string): TransferEntry {
  const entry: TransferEntry = {
    id: `te_${tag}`,
    orgId: player.orgId,
    playerId: player.id,
    fromSchoolId: player.currentSchoolId,
    status: "IN_PORTAL",
    windowType: "WINTER",
    seasonYear: 2026,
    enteredAt: now,
    isGradTransfer: false,
    outgoing: false,
    statusHistory: [{ status: "IN_PORTAL", at: now, source: "CFBD" }],
    createdAt: now,
    updatedAt: now,
  } as TransferEntry;
  db.transferEntries.push(entry);
  return entry;
}

/* ── Case 4: effective status + transfer entry + history sync together ──── */
test("commitAvailability syncs player, transfer entry, history and audit log", async () => {
  const tag = `case4_${Date.now()}`;
  const player = await makePlayer(tag);
  makeTransferEntry(player, tag);

  const historyBefore = (await repo.listTransferEntries(player.id))[0].statusHistory.length;
  const eventsBefore = (await repo.listStatusEvents(player.id)).length;
  assert.equal(eventsBefore, 0);

  // Build a staff override through the domain service.
  const state = playerToAvailabilityState(player);
  const { next, effective } = applySignal(state, {
    kind: "STAFF_OVERRIDE",
    status: "WITHDRAWN",
    note: "Player confirmed out by staff.",
    actorId: "coach_1",
    actorName: "Coach",
  });
  const patch = availabilityPatch(next, effective);

  await repo.commitAvailability(player.id, {
    patch,
    effectiveStatus: effective.status,
    event: {
      rawStatus: effective.rawStatus,
      effectiveStatus: effective.status,
      source: effective.source,
      reviewState: effective.reviewState,
      note: effective.note,
      actorId: effective.actorId,
      actorName: effective.actorName,
    },
  });

  // Player effective status changed.
  const updated = await repo.get(player.id);
  assert.equal(updated?.portalStatus, "WITHDRAWN");
  assert.equal(updated?.statusSource, "STAFF_OVERRIDE");

  // Active transfer entry status synced + one new history row appended.
  const entries = await repo.listTransferEntries(player.id);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].status, "WITHDRAWN");
  assert.equal(entries[0].statusHistory.length, historyBefore + 1);
  assert.equal(entries[0].statusHistory.at(-1)?.status, "WITHDRAWN");
  assert.ok(entries[0].withdrawnAt);

  // Exactly one audit row appended.
  const events = await repo.listStatusEvents(player.id);
  assert.equal(events.length, 1);
  assert.equal(events[0].effectiveStatus, "WITHDRAWN");
  assert.equal(events[0].source, "STAFF_OVERRIDE");
});

/* ── Case 8 (repo level): commit without an event writes no audit row ───── */
test("commitAvailability with event:undefined appends no status_events row", async () => {
  const tag = `case8_${Date.now()}`;
  const player = await makePlayer(tag);
  makeTransferEntry(player, tag);

  const before = (await repo.listStatusEvents(player.id)).length;
  assert.equal(before, 0);

  // Idempotent rerun: same effective status, no material change → no event.
  await repo.commitAvailability(player.id, {
    patch: { portalStatus: "IN_PORTAL", statusSource: "CFBD" },
    effectiveStatus: "IN_PORTAL",
    event: undefined,
  });

  const after = await repo.listStatusEvents(player.id);
  assert.equal(after.length, 0);
});
