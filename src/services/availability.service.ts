/**
 * Availability domain service — the SINGLE source of truth for a player's
 * effective portal status. Pure functions only (no DB, no React, no I/O) so the
 * precedence rules can be reused identically by server actions, the CFBD ingest
 * job, repositories, and tests.
 *
 * Effective status is derived from three independent layers in strict
 * precedence (database-design + issue #1):
 *
 *   STAFF_OVERRIDE  > ROSTER_CHECK  > CFBD  > (nothing → UNKNOWN)
 *
 * Rules enforced here:
 *  - CFBD ingest updates the raw layer only; it can never overwrite an active
 *    staff override or a verified roster check's effect.
 *  - A roster check supersedes CFBD but not an active staff override.
 *  - A staff override stays authoritative until explicitly cleared.
 *  - Clearing the override falls back to the strongest remaining source.
 *  - If the winning source is stale/unverified, the review state says so rather
 *    than silently assuming the player is available.
 */
import { z } from "zod";
import { PortalStatus } from "@/types/enums";
import {
  type StatusSource,
  type ReviewState,
  SOURCE_PRECEDENCE,
} from "@/types/availability";
import type { Player } from "@/types/player";

/**
 * Server-side validation for a manual staff override. Lives here (not in the
 * server action) so the rule "an override needs a non-empty reason" is enforced
 * in the domain layer and unit-testable without the Next runtime — the client is
 * never the sole guardrail.
 */
export const OverrideInputSchema = z.object({
  status: PortalStatus,
  note: z.string().trim().min(1, "A reason is required for a manual override.").max(500),
  evidenceUrl: z.string().trim().url("Evidence must be a valid URL.").optional().or(z.literal("")),
});
export type OverrideInput = z.infer<typeof OverrideInputSchema>;

/** A CFBD "in portal" with no real-world resolution this old is suspect. */
export const STALE_AFTER_DAYS = 45;
const DAY_MS = 86_400_000;

/* ──────────────────────────────────────────────────────────────────────────
 * The persisted layer state (mirrors the player table's availability columns).
 * ────────────────────────────────────────────────────────────────────────── */
export interface AvailabilityState {
  raw?: PortalStatus;
  rawUpdatedAt?: string;
  verified?: PortalStatus;
  verifiedAt?: string;
  verifiedNote?: string;
  verifiedEvidenceUrl?: string;
  override?: PortalStatus;
  overrideAt?: string;
  overrideNote?: string;
  overrideEvidenceUrl?: string;
  overrideActorId?: string;
  overrideActorName?: string;
}

/** The computed, authoritative answer the product displays and filters on. */
export interface EffectiveAvailability {
  status?: PortalStatus;
  source: StatusSource;
  reviewState: ReviewState;
  note?: string;
  evidenceUrl?: string;
  actorId?: string;
  actorName?: string;
  effectiveAt?: string;
  /** The raw CFBD value, preserved alongside the effective for transparency. */
  rawStatus?: PortalStatus;
  /** True when CFBD and the effective status disagree (drives the "why" note). */
  rawDiffersFromEffective: boolean;
  /** effective === IN_PORTAL — the available-player pool predicate. */
  isAvailable: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Core precedence resolution.
 * ────────────────────────────────────────────────────────────────────────── */
export function computeEffectiveAvailability(
  state: AvailabilityState,
  now: number = Date.now(),
): EffectiveAvailability {
  const rawStatus = state.raw;

  let status: PortalStatus | undefined;
  let source: StatusSource;
  let note: string | undefined;
  let evidenceUrl: string | undefined;
  let actorId: string | undefined;
  let actorName: string | undefined;
  let effectiveAt: string | undefined;
  let reviewState: ReviewState;

  if (state.override) {
    status = state.override;
    source = "STAFF_OVERRIDE";
    note = state.overrideNote;
    evidenceUrl = state.overrideEvidenceUrl;
    actorId = state.overrideActorId;
    actorName = state.overrideActorName;
    effectiveAt = state.overrideAt;
    reviewState = "VERIFIED";
  } else if (state.verified) {
    status = state.verified;
    source = "ROSTER_CHECK";
    note = state.verifiedNote;
    evidenceUrl = state.verifiedEvidenceUrl;
    effectiveAt = state.verifiedAt;
    reviewState = "VERIFIED";
  } else if (state.raw) {
    status = state.raw;
    source = "CFBD";
    effectiveAt = state.rawUpdatedAt;
    note = "From the CFBD transfer-portal feed — not independently verified.";
    reviewState = isStale(state.rawUpdatedAt, now) ? "STALE" : "UNVERIFIED";
  } else {
    status = undefined;
    source = "UNKNOWN";
    note = "No portal signal on record — treat as unconfirmed until checked.";
    reviewState = "STALE";
  }

  return {
    status,
    source,
    reviewState,
    note,
    evidenceUrl,
    actorId,
    actorName,
    effectiveAt,
    rawStatus,
    rawDiffersFromEffective: rawStatus != null && status != null && rawStatus !== status,
    isAvailable: status === "IN_PORTAL",
  };
}

function isStale(at: string | undefined, now: number): boolean {
  if (!at) return true;
  const t = Date.parse(at);
  if (Number.isNaN(t)) return true;
  return now - t > STALE_AFTER_DAYS * DAY_MS;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Reconciliation — apply one incoming signal and recompute, reporting whether
 * the change is material (so the audit log isn't spammed on idempotent reruns).
 * ────────────────────────────────────────────────────────────────────────── */
export type AvailabilitySignal =
  | { kind: "CFBD"; status?: PortalStatus; at?: string }
  | {
      kind: "ROSTER_CHECK";
      status: PortalStatus;
      at?: string;
      note?: string;
      evidenceUrl?: string;
    }
  | {
      kind: "STAFF_OVERRIDE";
      status: PortalStatus;
      at?: string;
      note: string;
      evidenceUrl?: string;
      actorId?: string;
      actorName?: string;
    }
  | { kind: "CLEAR_OVERRIDE"; at?: string; actorId?: string; actorName?: string };

export interface ReconcileResult {
  next: AvailabilityState;
  effective: EffectiveAvailability;
  /** True when the layers/effective changed materially (ignores timestamps). */
  changed: boolean;
}

export function applySignal(
  current: AvailabilityState,
  signal: AvailabilitySignal,
  now: number = Date.now(),
): ReconcileResult {
  const at = ("at" in signal && signal.at) || new Date(now).toISOString();
  const next: AvailabilityState = { ...current };

  switch (signal.kind) {
    case "CFBD":
      // Missing/contradictory CFBD status must never blank out a known value or
      // fabricate one — only a concrete status updates the raw layer.
      if (signal.status) {
        next.raw = signal.status;
        next.rawUpdatedAt = at;
      }
      break;
    case "ROSTER_CHECK":
      next.verified = signal.status;
      next.verifiedAt = at;
      next.verifiedNote = signal.note;
      next.verifiedEvidenceUrl = signal.evidenceUrl;
      break;
    case "STAFF_OVERRIDE":
      next.override = signal.status;
      next.overrideAt = at;
      next.overrideNote = signal.note;
      next.overrideEvidenceUrl = signal.evidenceUrl;
      next.overrideActorId = signal.actorId;
      next.overrideActorName = signal.actorName;
      break;
    case "CLEAR_OVERRIDE":
      next.override = undefined;
      next.overrideAt = undefined;
      next.overrideNote = undefined;
      next.overrideEvidenceUrl = undefined;
      next.overrideActorId = undefined;
      next.overrideActorName = undefined;
      break;
  }

  const before = computeEffectiveAvailability(current, now);
  const effective = computeEffectiveAvailability(next, now);
  const changed = isMaterialChange(current, next, before, effective);

  return { next, effective, changed };
}

/** Compare only the durable values (not timestamps) to keep reruns idempotent. */
function isMaterialChange(
  prev: AvailabilityState,
  next: AvailabilityState,
  before: EffectiveAvailability,
  after: EffectiveAvailability,
): boolean {
  return (
    before.status !== after.status ||
    before.source !== after.source ||
    before.reviewState !== after.reviewState ||
    prev.raw !== next.raw ||
    prev.verified !== next.verified ||
    prev.override !== next.override ||
    (prev.overrideNote ?? "") !== (next.overrideNote ?? "") ||
    (prev.verifiedNote ?? "") !== (next.verifiedNote ?? "")
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Player ↔ AvailabilityState mapping + the patch a write produces.
 * ────────────────────────────────────────────────────────────────────────── */
export function playerToAvailabilityState(p: Player): AvailabilityState {
  return {
    raw: p.rawPortalStatus,
    rawUpdatedAt: p.rawStatusUpdatedAt,
    verified: p.verifiedPortalStatus,
    verifiedAt: p.verifiedAt,
    verifiedNote: p.verifiedNote,
    verifiedEvidenceUrl: p.verifiedEvidenceUrl,
    override: p.overridePortalStatus,
    overrideAt: p.overrideAt,
    overrideNote: p.overrideNote,
    overrideEvidenceUrl: p.overrideEvidenceUrl,
    overrideActorId: p.overrideActorId,
    overrideActorName: p.overrideActorName,
  };
}

/** The full set of availability columns to persist after a reconcile. */
export function availabilityPatch(
  state: AvailabilityState,
  effective: EffectiveAvailability,
  now: string = new Date().toISOString(),
): Partial<Player> {
  return {
    portalStatus: effective.status,
    statusSource: effective.source,
    statusReviewState: effective.reviewState,
    statusNote: effective.note,
    statusEvidenceUrl: effective.evidenceUrl,
    availabilityCheckedAt: now,
    rawPortalStatus: state.raw,
    rawStatusUpdatedAt: state.rawUpdatedAt,
    verifiedPortalStatus: state.verified,
    verifiedAt: state.verifiedAt,
    verifiedNote: state.verifiedNote,
    verifiedEvidenceUrl: state.verifiedEvidenceUrl,
    overridePortalStatus: state.override,
    overrideAt: state.overrideAt,
    overrideNote: state.overrideNote,
    overrideEvidenceUrl: state.overrideEvidenceUrl,
    overrideActorId: state.overrideActorId,
    overrideActorName: state.overrideActorName,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * UI projection — a flat, display-ready view of a player's availability.
 * ────────────────────────────────────────────────────────────────────────── */
export interface AvailabilityView extends EffectiveAvailability {
  isOverride: boolean;
  isVerified: boolean;
  /** Human-readable provenance label, e.g. "Staff override" / "CFBD feed". */
  sourceLabel: string;
  /** A one-line explanation, including the raw↔effective discrepancy if any. */
  explanation: string;
  lastVerifiedAt?: string;
  sourceUpdatedAt?: string;
}

const SOURCE_LABEL: Record<StatusSource, string> = {
  STAFF_OVERRIDE: "Staff override",
  ROSTER_CHECK: "Verified roster check",
  CFBD: "CFBD feed",
  UNKNOWN: "Unconfirmed",
};

export function getAvailabilityView(player: Player, now: number = Date.now()): AvailabilityView {
  const state = playerToAvailabilityState(player);
  const eff = computeEffectiveAvailability(state, now);
  const explanation = buildExplanation(eff);
  return {
    ...eff,
    isOverride: eff.source === "STAFF_OVERRIDE",
    isVerified: eff.source === "STAFF_OVERRIDE" || eff.source === "ROSTER_CHECK",
    sourceLabel: SOURCE_LABEL[eff.source],
    explanation,
    lastVerifiedAt: state.override ? state.overrideAt : state.verified ? state.verifiedAt : undefined,
    sourceUpdatedAt: state.rawUpdatedAt,
  };
}

function buildExplanation(eff: EffectiveAvailability): string {
  if (eff.rawDiffersFromEffective && eff.rawStatus) {
    const raw = humanizeStatus(eff.rawStatus);
    const e = eff.status ? humanizeStatus(eff.status) : "unconfirmed";
    return `${SOURCE_LABEL[eff.source]} marks this player ${e}; the CFBD feed still shows ${raw}.`;
  }
  if (eff.source === "CFBD" && eff.reviewState === "STALE") {
    return "CFBD feed status is unverified and may be stale — confirm before acting.";
  }
  if (eff.source === "UNKNOWN") {
    return "No portal signal on record — confirm availability before acting.";
  }
  return eff.note ?? SOURCE_LABEL[eff.source];
}

function humanizeStatus(s: PortalStatus): string {
  return s.replace(/_/g, " ").toLowerCase();
}

export { SOURCE_PRECEDENCE };
