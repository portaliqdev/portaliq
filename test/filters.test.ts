import { test } from "node:test";
import assert from "node:assert/strict";

import { db } from "@/lib/mock-data";
import { applyPlayerFilters } from "@/lib/mock-data/query";
import type { Player, PortalStatus } from "@/types/player";

/** Clone a real seeded player and override its effective portalStatus. */
function withStatus(status: PortalStatus, idx: number): Player {
  const base = db.players[idx % db.players.length];
  return { ...base, id: `test_${status}_${idx}`, portalStatus: status };
}

const sample: Player[] = [
  withStatus("IN_PORTAL", 0),
  withStatus("IN_PORTAL", 1),
  withStatus("COMMITTED", 2),
  withStatus("WITHDRAWN", 3),
  withStatus("ENROLLED", 4),
];

/* ── Case 5: default available-player query excludes the unavailable ────── */
test("availableOnly keeps only effective IN_PORTAL players", () => {
  const out = applyPlayerFilters(sample, { availableOnly: true });
  assert.equal(out.length, 2);
  assert.ok(out.every((p) => p.portalStatus === "IN_PORTAL"));
  assert.ok(!out.some((p) => ["COMMITTED", "WITHDRAWN", "ENROLLED"].includes(p.portalStatus!)));
});

/* ── Case 6: explicit status filters can retrieve unavailable players ───── */
test("portalStatuses can intentionally retrieve withdrawn players", () => {
  const out = applyPlayerFilters(sample, { portalStatuses: ["WITHDRAWN"] });
  assert.equal(out.length, 1);
  assert.equal(out[0].portalStatus, "WITHDRAWN");
});

test("an explicit portalStatuses filter overrides availableOnly", () => {
  // availableOnly is ignored when portalStatuses is set (intentional inclusion).
  const out = applyPlayerFilters(sample, {
    availableOnly: true,
    portalStatuses: ["COMMITTED", "ENROLLED"],
  });
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map((p) => p.portalStatus).sort(),
    ["COMMITTED", "ENROLLED"],
  );
});
