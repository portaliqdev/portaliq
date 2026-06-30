"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/di";
import {
  playerToAvailabilityState,
  applySignal,
  availabilityPatch,
  OverrideInputSchema,
  type AvailabilitySignal,
  type EffectiveAvailability,
} from "@/services/availability.service";
import type { CommitAvailabilityInput } from "@/repositories";

/**
 * Staff availability actions — the only client entry points that mutate a
 * player's portal availability. Precedence + reconciliation live entirely in the
 * availability service; these actions just validate input, run the signal, and
 * persist atomically (player + transfer entry + audit event). The client is
 * never trusted as the sole guardrail — status and note are re-validated here.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

async function runSignal(playerId: string, build: (actor: { id?: string; name?: string }) => AvailabilitySignal): Promise<ActionResult> {
  const repos = getRepositories();
  const player = await repos.players.get(playerId);
  if (!player) return { ok: false, error: "Player not found." };

  const user = await repos.users.getCurrentUser().catch(() => null);
  const actor = { id: user?.id, name: user?.displayName };

  const signal = build(actor);
  const { next, effective, changed } = applySignal(playerToAvailabilityState(player), signal);

  const input: CommitAvailabilityInput = {
    patch: availabilityPatch(next, effective),
    effectiveStatus: effective.status,
    event: changed ? buildEvent(effective, actor) : undefined,
  };
  await repos.players.commitAvailability(playerId, input);

  revalidateAvailability(playerId);
  return { ok: true };
}

function buildEvent(effective: EffectiveAvailability, actor: { id?: string; name?: string }) {
  return {
    rawStatus: effective.rawStatus,
    effectiveStatus: effective.status,
    source: effective.source,
    reviewState: effective.reviewState,
    note: effective.note,
    evidenceUrl: effective.evidenceUrl,
    actorId: effective.actorId ?? actor.id,
    actorName: effective.actorName ?? actor.name,
  };
}

/** Set a manual staff override — authoritative over CFBD and roster checks. */
export async function setAvailabilityOverrideAction(
  playerId: string,
  raw: { status: string; note: string; evidenceUrl?: string },
): Promise<ActionResult> {
  const parsed = OverrideInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid override." };
  }
  const { status, note, evidenceUrl } = parsed.data;
  try {
    return await runSignal(playerId, (actor) => ({
      kind: "STAFF_OVERRIDE",
      status,
      note,
      evidenceUrl: evidenceUrl || undefined,
      actorId: actor.id,
      actorName: actor.name,
    }));
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Clear an active override — fall back to the strongest source-derived status. */
export async function clearAvailabilityOverrideAction(playerId: string): Promise<ActionResult> {
  try {
    return await runSignal(playerId, (actor) => ({
      kind: "CLEAR_OVERRIDE",
      actorId: actor.id,
      actorName: actor.name,
    }));
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Refresh every surface that can show portal availability or active counts. */
function revalidateAvailability(playerId: string) {
  revalidatePath(`/app/players/${playerId}`);
  revalidatePath("/app/portal");
  revalidatePath("/app/board");
  revalidatePath("/app");
  revalidatePath("/app/needs");
  revalidatePath("/app/reports");
}
