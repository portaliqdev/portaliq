import { z } from "zod";
import { PortalStatus } from "./enums";

/* ──────────────────────────────────────────────────────────────────────────
 * Availability provenance — the trust model behind a player's portal status.
 *
 * A player's *effective* portalStatus is COMPUTED from three independent
 * layers, in strict precedence:
 *
 *   STAFF_OVERRIDE  — a coach manually set it; authoritative until cleared.
 *   ROSTER_CHECK    — verified against an official roster / school source.
 *   CFBD            — the raw transfer-portal feed.
 *
 * Each layer is persisted separately on the player row so the effective status
 * is always re-derivable and clearing a higher layer cleanly falls back to the
 * next. Every change is also appended to the status_events audit log.
 * ────────────────────────────────────────────────────────────────────────── */

export const StatusSource = z.enum([
  "STAFF_OVERRIDE",
  "ROSTER_CHECK",
  "CFBD",
  "UNKNOWN",
]);
export type StatusSource = z.infer<typeof StatusSource>;

/** Higher wins. Used by the availability service to pick the effective layer. */
export const SOURCE_PRECEDENCE: Record<StatusSource, number> = {
  STAFF_OVERRIDE: 3,
  ROSTER_CHECK: 2,
  CFBD: 1,
  UNKNOWN: 0,
};

/**
 * Confidence in the effective status — drives the "surface for staff review
 * rather than silently assume available" requirement. Kept separate from
 * PortalStatus so the four canonical states are never diluted.
 */
export const ReviewState = z.enum([
  "VERIFIED", // backed by a staff override or roster check
  "UNVERIFIED", // CFBD-only, never confirmed
  "STALE", // CFBD-only and the source update is old, or no signal at all
]);
export type ReviewState = z.infer<typeof ReviewState>;

/** Author of an availability change (staff override or system source). */
export const StatusActorSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
});
export type StatusActor = z.infer<typeof StatusActorSchema>;

/**
 * One immutable row in the chronological availability audit log
 * (status_events table). Captures both raw and effective status so a reviewer
 * can always reconstruct why the product showed what it showed.
 */
export const StatusEventSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerId: z.string(),
  transferEntryId: z.string().optional(),
  // What the source reported vs. what PortalIQ resolved as authoritative.
  rawStatus: PortalStatus.optional(),
  effectiveStatus: PortalStatus.optional(),
  source: StatusSource,
  reviewState: ReviewState.optional(),
  note: z.string().optional(),
  evidenceUrl: z.string().optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  createdAt: z.string(),
});
export type StatusEvent = z.infer<typeof StatusEventSchema>;
