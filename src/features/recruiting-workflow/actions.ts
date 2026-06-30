"use server";

import { revalidatePath } from "next/cache";
import { getRepositories, getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import type {
  OfferStatus,
  RecruitingPriority,
  RecruitingStatus,
  RecruitingWorkflow,
  StaffOwner,
} from "@/types/recruiting-workflow";
import type {
  LogRecruitingContactInput,
  RecruitingWorkflowMetrics,
  RecruitingWorkflowMetricsFilters,
  ScheduleRecruitingVisitInput,
  SetNextActionInput,
  UpdateRecruitingOfferInput,
} from "./types";

interface RecruitingWorkflowService {
  getWorkflow(workflowId: string): Promise<RecruitingWorkflow | null>;
  getByPlayer?(playerId: string): Promise<RecruitingWorkflow | null>;
  getMetrics(
    orgId: string,
    filters?: RecruitingWorkflowMetricsFilters,
  ): Promise<RecruitingWorkflowMetrics>;
  updateStatus(
    workflowId: string,
    status: RecruitingStatus,
    actor: StaffOwner,
    note?: string,
  ): Promise<RecruitingWorkflow>;
  assignOwner(
    workflowId: string,
    owner: StaffOwner | undefined,
    actor: StaffOwner,
    note?: string,
  ): Promise<RecruitingWorkflow>;
  updatePriority(
    workflowId: string,
    priority: RecruitingPriority,
    actor: StaffOwner,
    note?: string,
  ): Promise<RecruitingWorkflow>;
  addNote(
    workflowId: string,
    note: string,
    actor: StaffOwner,
  ): Promise<RecruitingWorkflow>;
  updateNextAction(
    workflowId: string,
    nextAction: { action?: string; dueAt?: string; note?: string },
    actor: StaffOwner,
  ): Promise<RecruitingWorkflow>;
  logContact(
    workflowId: string,
    contact: {
      method: "CALL" | "TEXT" | "EMAIL";
      contactedAt?: string;
      outcome?: string;
      note?: string;
      nextAction?: string;
      nextActionAt?: string;
    },
    actor: StaffOwner,
  ): Promise<RecruitingWorkflow>;
  scheduleVisit(
    workflowId: string,
    visit: {
      visitAt: string;
      status?: "SCHEDULED" | "COMPLETED" | "CANCELED";
      type?: "OFFICIAL" | "UNOFFICIAL";
      location?: string;
      note?: string;
    },
    actor: StaffOwner,
  ): Promise<RecruitingWorkflow>;
  markOfferExtended(
    workflowId: string,
    actor: StaffOwner,
    offer?: {
      extendedAt?: string;
      status?: Exclude<OfferStatus, "NOT_EXTENDED" | "UNDER_REVIEW">;
      terms?: string;
      note?: string;
    },
  ): Promise<RecruitingWorkflow>;
  updateOffer?(
    workflowId: string,
    offer: UpdateRecruitingOfferInput,
    actor: StaffOwner,
  ): Promise<RecruitingWorkflow>;
}

function workflowService(): RecruitingWorkflowService {
  const services = getServices() as unknown as {
    recruitingWorkflow?: RecruitingWorkflowService;
  };

  if (!services.recruitingWorkflow) {
    throw new Error("Recruiting workflow service is not registered.");
  }

  return services.recruitingWorkflow;
}

async function currentActor(): Promise<StaffOwner> {
  const user = await getRepositories().users.getCurrentUser();
  return {
    id: user.id,
    name: user.displayName,
    role: user.role,
    photoUrl: user.photoUrl,
  };
}

async function workflowForPlayer(playerId: string) {
  const service = workflowService();
  const repositories = getRepositories() as unknown as {
    recruitingWorkflow?: {
      list(filters: { playerId: string }): Promise<RecruitingWorkflow[]>;
    };
  };
  const workflow = service.getByPlayer
    ? await service.getByPlayer(playerId)
    : repositories.recruitingWorkflow
      ? (await repositories.recruitingWorkflow.list({ playerId }))[0] ?? null
      : await service.getWorkflow(playerId);

  if (!workflow) {
    throw new Error(`Recruiting workflow not found for player ${playerId}.`);
  }

  return workflow;
}

function revalidateWorkflow(playerId: string) {
  revalidatePath(`/app/players/${playerId}`);
  revalidatePath("/app/portal");
  revalidatePath("/app/board");
  revalidatePath("/app");
}

export async function getRecruitingWorkflowAction(playerId: string) {
  return workflowForPlayer(playerId);
}

export async function getRecruitingWorkflowMetricsAction(
  filters: RecruitingWorkflowMetricsFilters = {},
) {
  return workflowService().getMetrics(ORG_ID, filters);
}

export async function getRecruitingOwnersAction() {
  const users = await getRepositories().users.listByOrg(ORG_ID);
  return users
    .filter((user) => user.isActive)
    .map(({ id, displayName, role, photoUrl }) => ({
      id,
      name: displayName,
      role,
      photoUrl,
    }));
}

export async function updateRecruitingStatusAction(
  playerId: string,
  status: RecruitingStatus,
) {
  const [workflow, actor] = await Promise.all([
    workflowForPlayer(playerId),
    currentActor(),
  ]);
  const updated = await workflowService().updateStatus(
    workflow.id,
    status,
    actor,
  );
  revalidateWorkflow(playerId);
  return updated;
}

export async function assignRecruitingOwnerAction(
  playerId: string,
  ownerId: string | null,
) {
  const [workflow, actor, ownerUser] = await Promise.all([
    workflowForPlayer(playerId),
    currentActor(),
    ownerId ? getRepositories().users.get(ownerId) : Promise.resolve(null),
  ]);
  const owner = ownerUser
    ? {
        id: ownerUser.id,
        name: ownerUser.displayName,
        role: ownerUser.role,
        photoUrl: ownerUser.photoUrl,
      }
    : undefined;
  const updated = await workflowService().assignOwner(
    workflow.id,
    owner,
    actor,
  );
  revalidateWorkflow(playerId);
  return updated;
}

export async function updateRecruitingPriorityAction(
  playerId: string,
  priority: RecruitingPriority,
) {
  const [workflow, actor] = await Promise.all([
    workflowForPlayer(playerId),
    currentActor(),
  ]);
  const updated = await workflowService().updatePriority(
    workflow.id,
    priority,
    actor,
  );
  revalidateWorkflow(playerId);
  return updated;
}

export async function addRecruitingNoteAction(playerId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("A recruiting note cannot be empty.");

  const [workflow, actor] = await Promise.all([
    workflowForPlayer(playerId),
    currentActor(),
  ]);
  const updated = await workflowService().addNote(
    workflow.id,
    trimmed,
    actor,
  );
  revalidateWorkflow(playerId);
  return updated;
}

export async function setRecruitingNextActionAction(input: SetNextActionInput) {
  const [workflow, actor] = await Promise.all([
    workflowForPlayer(input.playerId),
    currentActor(),
  ]);
  const updated = await workflowService().updateNextAction(
    workflow.id,
    {
      action: input.summary.trim(),
      dueAt: input.dueAt,
      note: `Action type: ${input.type}`,
    },
    actor,
  );
  revalidateWorkflow(input.playerId);
  return updated;
}

export async function logRecruitingContactAction(
  input: LogRecruitingContactInput,
) {
  const [workflow, actor] = await Promise.all([
    workflowForPlayer(input.playerId),
    currentActor(),
  ]);
  const updated = await workflowService().logContact(
    workflow.id,
    {
      method: input.method,
      contactedAt: input.occurredAt,
      outcome: input.outcome?.trim() || undefined,
      note: input.note?.trim() || undefined,
      nextAction: input.nextAction?.trim() || undefined,
      nextActionAt: input.nextActionAt,
    },
    actor,
  );
  revalidateWorkflow(input.playerId);
  return updated;
}

export async function scheduleRecruitingVisitAction(
  input: ScheduleRecruitingVisitInput,
) {
  const [workflow, actor] = await Promise.all([
    workflowForPlayer(input.playerId),
    currentActor(),
  ]);
  const updated = await workflowService().scheduleVisit(
    workflow.id,
    {
      visitAt: input.startsAt,
      status: input.status,
      type: input.type,
      location: input.location?.trim() || undefined,
      note: input.notes?.trim() || undefined,
    },
    actor,
  );
  revalidateWorkflow(input.playerId);
  return updated;
}

export async function updateRecruitingOfferAction(
  input: UpdateRecruitingOfferInput,
) {
  const service = workflowService();
  const [workflow, actor] = await Promise.all([
    workflowForPlayer(input.playerId),
    currentActor(),
  ]);

  let updated: RecruitingWorkflow;
  if (service.updateOffer) {
    updated = await service.updateOffer(workflow.id, input, actor);
  } else if (
    input.status !== "NOT_EXTENDED" &&
    input.status !== "UNDER_REVIEW"
  ) {
    updated = await service.markOfferExtended(workflow.id, actor, {
      status: input.status,
      extendedAt: input.extendedAt,
      terms: input.terms?.trim() || undefined,
      note: input.notes?.trim() || undefined,
    });
  } else {
    throw new Error(
      "This workflow service does not support pre-offer status updates yet.",
    );
  }

  revalidateWorkflow(input.playerId);
  return updated;
}
