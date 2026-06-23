"use server";

import { revalidatePath } from "next/cache";
import { getRepositories, getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import type { BoardStage } from "@/types/enums";
import type { RecruitingPriority, StaffOwner } from "@/types/recruiting-workflow";

export async function addToBoardAction(playerId: string) {
  const entry = await getServices().board.addPlayer(ORG_ID, playerId, "NEEDS_REVIEW");
  return { ok: Boolean(entry) };
}

export async function moveBoardEntryAction(entryId: string, stage: BoardStage, rank: number) {
  try {
    await getServices().board.moveStage(entryId, stage, rank);
    revalidatePath("/board");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

/* ── inline card actions (priority / note / owner) ─────────────────────────────
 * All route through the recruiting-workflow service, whose getByPlayer
 * auto-creates a workflow on demand — so these work for any board card, even
 * ones not yet in the workflow. */

async function me(): Promise<StaffOwner> {
  const u = await getRepositories().users.getCurrentUser();
  return { id: u.id, name: u.displayName, role: u.role, photoUrl: u.photoUrl };
}

export async function setBoardPriorityAction(playerId: string, priority: RecruitingPriority) {
  try {
    const wf = await getServices().workflow.getByPlayer(playerId); // ensure exists
    if (!wf) return { ok: false as const, error: "Player not found." };
    await getServices().workflow.updatePriority(playerId, priority, await me());
    revalidatePath("/board");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function addBoardNoteAction(playerId: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return { ok: false as const, error: "Note is empty." };
  try {
    const wf = await getServices().workflow.getByPlayer(playerId);
    if (!wf) return { ok: false as const, error: "Player not found." };
    await getServices().workflow.addNote(playerId, trimmed, await me());
    revalidatePath("/board");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function assignBoardOwnerToMeAction(playerId: string) {
  try {
    const wf = await getServices().workflow.getByPlayer(playerId); // ensure exists
    if (!wf) return { ok: false as const, error: "Player not found." };
    const actor = await me();
    const assign = wf.owner?.id === actor.id ? undefined : actor; // toggle
    await getServices().workflow.assignOwner(playerId, assign, actor);
    revalidatePath("/board");
    return { ok: true as const, ownerName: assign?.name ?? null };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
