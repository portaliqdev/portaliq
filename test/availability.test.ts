import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeEffectiveAvailability,
  applySignal,
  getAvailabilityView,
  OverrideInputSchema,
  STALE_AFTER_DAYS,
  type AvailabilityState,
} from "@/services/availability.service";

const NOW = Date.parse("2026-06-30T00:00:00.000Z");
const recent = new Date(NOW - 1 * 86_400_000).toISOString();

/* Sanity: the @/ path alias resolves under the tsx loader. */
test("path alias @/ resolves and service is importable", () => {
  assert.equal(typeof computeEffectiveAvailability, "function");
  assert.equal(typeof STALE_AFTER_DAYS, "number");
});

/* ── Case 1: precedence ─────────────────────────────────────────────────── */
test("precedence: STAFF_OVERRIDE beats ROSTER_CHECK and CFBD", () => {
  const state: AvailabilityState = {
    raw: "IN_PORTAL",
    rawUpdatedAt: recent,
    verified: "COMMITTED",
    verifiedAt: recent,
    override: "WITHDRAWN",
    overrideAt: recent,
    overrideNote: "Coach confirmed the player is out.",
  };
  const eff = computeEffectiveAvailability(state, NOW);
  assert.equal(eff.source, "STAFF_OVERRIDE");
  assert.equal(eff.status, "WITHDRAWN");
  assert.equal(eff.reviewState, "VERIFIED");
});

test("precedence: ROSTER_CHECK beats CFBD when no override", () => {
  const state: AvailabilityState = {
    raw: "IN_PORTAL",
    rawUpdatedAt: recent,
    verified: "COMMITTED",
    verifiedAt: recent,
    verifiedNote: "Verified against official roster.",
  };
  const eff = computeEffectiveAvailability(state, NOW);
  assert.equal(eff.source, "ROSTER_CHECK");
  assert.equal(eff.status, "COMMITTED");
  assert.equal(eff.reviewState, "VERIFIED");
});

/* ── Case 2: clearing an override falls back to strongest remaining ─────── */
test("clearing a staff override falls back to verified roster check", () => {
  const state: AvailabilityState = {
    raw: "IN_PORTAL",
    rawUpdatedAt: recent,
    verified: "COMMITTED",
    verifiedAt: recent,
    verifiedNote: "Roster confirmed.",
    override: "WITHDRAWN",
    overrideAt: recent,
    overrideNote: "Temporary override.",
  };
  const { next, effective } = applySignal(state, { kind: "CLEAR_OVERRIDE", at: recent }, NOW);
  assert.equal(next.override, undefined);
  assert.equal(effective.source, "ROSTER_CHECK");
  assert.equal(effective.status, "COMMITTED");
});

test("clearing a staff override with only raw falls back to CFBD", () => {
  const state: AvailabilityState = {
    raw: "IN_PORTAL",
    rawUpdatedAt: recent,
    override: "WITHDRAWN",
    overrideAt: recent,
    overrideNote: "Temporary override.",
  };
  const { effective } = applySignal(state, { kind: "CLEAR_OVERRIDE", at: recent }, NOW);
  assert.equal(effective.source, "CFBD");
  assert.equal(effective.status, "IN_PORTAL");
});

/* ── Case 3: CFBD ingest must not clobber a staff override ──────────────── */
test("CFBD ingest does not clobber a staff override but updates raw underneath", () => {
  const state: AvailabilityState = {
    raw: "COMMITTED",
    rawUpdatedAt: recent,
    override: "WITHDRAWN",
    overrideAt: recent,
    overrideNote: "Player is out per staff.",
  };
  const { next, effective } = applySignal(
    state,
    { kind: "CFBD", status: "IN_PORTAL", at: recent },
    NOW,
  );
  // Effective is unchanged — still the override.
  assert.equal(effective.source, "STAFF_OVERRIDE");
  assert.equal(effective.status, "WITHDRAWN");
  // Raw layer updated underneath.
  assert.equal(next.raw, "IN_PORTAL");
  assert.equal(effective.rawStatus, "IN_PORTAL");
});

/* ── Case 7: empty manual override notes are rejected server-side ───────── */
test("OverrideInputSchema rejects empty/whitespace notes and accepts a valid one", () => {
  assert.equal(OverrideInputSchema.safeParse({ status: "WITHDRAWN", note: "  " }).success, false);
  assert.equal(OverrideInputSchema.safeParse({ status: "WITHDRAWN", note: "" }).success, false);
  const ok = OverrideInputSchema.safeParse({ status: "WITHDRAWN", note: "Confirmed out by staff." });
  assert.equal(ok.success, true);
});

/* ── Case 8: idempotent ingest reports no material change ───────────────── */
test("idempotent CFBD ingest with same status reports changed === false", () => {
  const base: AvailabilityState = {};
  const first = applySignal(base, { kind: "CFBD", status: "IN_PORTAL", at: recent }, NOW);
  assert.equal(first.changed, true);
  const second = applySignal(
    first.next,
    { kind: "CFBD", status: "IN_PORTAL", at: new Date(NOW).toISOString() },
    NOW,
  );
  assert.equal(second.changed, false);
});

/* ── Case 9: raw/effective conflict surfaced in the domain response ─────── */
test("raw/effective conflict: rawDiffersFromEffective and explanation mention both", () => {
  const state: AvailabilityState = {
    raw: "IN_PORTAL",
    rawUpdatedAt: recent,
    override: "WITHDRAWN",
    overrideAt: recent,
    overrideNote: "Player withdrew per staff.",
  };
  const eff = computeEffectiveAvailability(state, NOW);
  assert.equal(eff.rawDiffersFromEffective, true);
  assert.equal(eff.rawStatus, "IN_PORTAL");
  assert.equal(eff.status, "WITHDRAWN");

  // The display projection must explain both the effective and the raw value.
  const player = {
    rawPortalStatus: state.raw,
    rawStatusUpdatedAt: state.rawUpdatedAt,
    overridePortalStatus: state.override,
    overrideAt: state.overrideAt,
    overrideNote: state.overrideNote,
  } as unknown as Parameters<typeof getAvailabilityView>[0];
  const view = getAvailabilityView(player, NOW);
  assert.match(view.explanation, /withdrawn/i);
  assert.match(view.explanation, /in portal/i);
});
