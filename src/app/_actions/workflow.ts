"use server";

import { revalidatePath } from "next/cache";
import { getServices, getRepositories } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import type { RecruitingPriority, RecruitingStatus, StaffOwner } from "@/types/recruiting-workflow";

/** Current staff member as a workflow actor/owner stamp. */
async function currentOwner(): Promise<StaffOwner> {
  const u = await getRepositories().users.getCurrentUser();
  const initials = u.displayName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return { id: u.id, name: u.displayName, role: u.role, initials };
}

function refresh(playerId: string) {
  revalidatePath(`/players/${playerId}`);
  revalidatePath("/portal");
  revalidatePath("/board");
  revalidatePath("/");
}

async function run<T>(playerId: string, fn: () => Promise<T>) {
  try {
    const data = await fn();
    refresh(playerId);
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function getWorkflowAction(playerId: string) {
  return getServices().workflow.getByPlayer(playerId);
}

export async function getWorkflowMetricsAction() {
  return getServices().workflow.getMetrics(ORG_ID);
}

export async function setWorkflowStatusAction(playerId: string, status: RecruitingStatus, note?: string) {
  return run(playerId, async () =>
    getServices().workflow.updateStatus(playerId, status, await currentOwner(), note),
  );
}

export async function setWorkflowPriorityAction(playerId: string, priority: RecruitingPriority) {
  return run(playerId, async () =>
    getServices().workflow.updatePriority(playerId, priority, await currentOwner()),
  );
}

export async function assignWorkflowOwnerAction(playerId: string, assign: boolean) {
  return run(playerId, async () =>
    getServices().workflow.assignOwner(playerId, assign ? await currentOwner() : undefined, await currentOwner()),
  );
}

export async function addWorkflowNoteAction(playerId: string, note: string) {
  return run(playerId, async () => getServices().workflow.addNote(playerId, note, await currentOwner()));
}

export async function logWorkflowContactAction(
  playerId: string,
  method: "CALL" | "TEXT" | "EMAIL",
  note?: string,
) {
  return run(playerId, async () =>
    getServices().workflow.logContact(playerId, { method, note }, await currentOwner()),
  );
}

export async function scheduleWorkflowVisitAction(playerId: string, visitAt: string, note?: string) {
  return run(playerId, async () =>
    getServices().workflow.scheduleVisit(playerId, { visitAt, note }, await currentOwner()),
  );
}

export async function markWorkflowOfferAction(playerId: string, note?: string) {
  return run(playerId, async () =>
    getServices().workflow.markOfferExtended(playerId, await currentOwner(), { note }),
  );
}

export async function setWorkflowNextActionAction(playerId: string, action: string, dueAt?: string) {
  return run(playerId, async () =>
    getServices().workflow.updateNextAction(playerId, { action, dueAt }, await currentOwner()),
  );
}
