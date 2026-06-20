"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/di";
import type { PortalStatus } from "@/types/player";

/**
 * Manual staff availability override — authoritative over the CFBD feed. Coaches
 * routinely know a player has withdrawn/committed before CFBD records it (e.g.
 * a player still shown "Immediate" months after entering). This sets the
 * effective status and stamps it STAFF_OVERRIDE so re-ingestion won't clobber it.
 */
export async function setAvailabilityAction(
  playerId: string,
  status: PortalStatus,
  note?: string,
) {
  try {
    const repos = getRepositories();
    const user = await repos.users.getCurrentUser().catch(() => null);
    await repos.players.update(playerId, {
      portalStatus: status,
      statusSource: "STAFF_OVERRIDE",
      availabilityCheckedAt: new Date().toISOString(),
      statusNote:
        note?.trim() ||
        `Marked ${status.replace(/_/g, " ").toLowerCase()} by ${user?.displayName ?? "staff"}.`,
    });
    revalidatePath(`/players/${playerId}`);
    revalidatePath("/portal");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
