import { db } from "@/lib/mock-data";
import { createMockRecruitingWorkflowSeed } from "@/lib/mock-data/recruiting-workflows";
import type {
  AddRecruitingActivityInput,
  AddRecruitingNoteInput,
  CreateRecruitingWorkflowInput,
  RecruitingWorkflowRepository,
  UpdateRecruitingWorkflowInput,
} from "@/repositories/recruiting-workflow.repository";
import {
  RecruitingActivitySchema,
  RecruitingWorkflowSchema,
  type RecruitingActivity,
  type RecruitingWorkflow,
  type RecruitingWorkflowFilters,
} from "@/types/recruiting-workflow";

let generatedId = 0;

function newId(prefix: string): string {
  generatedId += 1;
  return `${prefix}_mock_${String(generatedId).padStart(4, "0")}`;
}

function matchesFilters(
  workflow: RecruitingWorkflow,
  filters: RecruitingWorkflowFilters,
): boolean {
  if (filters.orgId && workflow.orgId !== filters.orgId) return false;
  if (filters.playerId && workflow.playerId !== filters.playerId) return false;
  if (filters.ownerId && workflow.owner?.id !== filters.ownerId) return false;
  if (filters.statuses && !filters.statuses.includes(workflow.status)) return false;
  if (
    filters.priorities &&
    !filters.priorities.includes(workflow.priority)
  ) {
    return false;
  }
  if (filters.riskLevels && !filters.riskLevels.includes(workflow.riskLevel)) {
    return false;
  }
  return true;
}

export class MockRecruitingWorkflowRepository
  implements RecruitingWorkflowRepository
{
  private readonly workflows: RecruitingWorkflow[];

  constructor(seed?: RecruitingWorkflow[]) {
    this.workflows = (
      seed ??
      createMockRecruitingWorkflowSeed(db.players, db.users, db.boardEntries)
    ).map((workflow) => RecruitingWorkflowSchema.parse(workflow));
  }

  async getByPlayerId(playerId: string): Promise<RecruitingWorkflow | null> {
    return this.workflows.find((workflow) => workflow.playerId === playerId) ?? null;
  }

  async listByStatus(status: RecruitingWorkflow["status"]) {
    return this.list({ statuses: [status] });
  }

  async listByOwner(owner: string) {
    return this.workflows.filter(
      (workflow) => workflow.owner?.id === owner || workflow.owner?.name === owner,
    );
  }

  async listNeedsActionToday() {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return this.workflows.filter((workflow) => {
      if (!workflow.nextActionAt) return false;
      return new Date(workflow.nextActionAt).getTime() <= end.getTime();
    });
  }

  async list(
    filters: RecruitingWorkflowFilters = {},
  ): Promise<RecruitingWorkflow[]> {
    return this.workflows
      .filter((workflow) => matchesFilters(workflow, filters))
      .sort(
        (a, b) =>
          (b.priority === "CRITICAL" ? 1 : 0) -
            (a.priority === "CRITICAL" ? 1 : 0) ||
          (b.updatedAt.localeCompare(a.updatedAt)),
      );
  }

  async createForPlayer(
    playerId: string,
    input: Omit<CreateRecruitingWorkflowInput, "playerId">,
  ): Promise<RecruitingWorkflow> {
    const now = new Date().toISOString();
    const workflow = RecruitingWorkflowSchema.parse({
      ...input,
      playerId,
      id: newId("rw"),
      activities: input.activities ?? [],
      createdAt: now,
      updatedAt: now,
    });
    this.workflows.push(workflow);
    return workflow;
  }

  async updateWorkflow(
    playerId: string,
    patch: UpdateRecruitingWorkflowInput,
  ): Promise<RecruitingWorkflow> {
    const index = this.workflows.findIndex((workflow) => workflow.playerId === playerId);
    if (index < 0) throw new Error(`Recruiting workflow for player ${playerId} not found`);

    const updated = RecruitingWorkflowSchema.parse({
      ...this.workflows[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    this.workflows[index] = updated;
    return updated;
  }

  async addNote(
    playerId: string,
    input: AddRecruitingNoteInput,
  ): Promise<RecruitingActivity> {
    return this.addActivity(playerId, {
      type: "NOTE",
      title: "Note added",
      detail: input.text,
      createdBy: input.author,
      createdAt: input.createdAt,
    });
  }

  async addActivity(
    playerId: string,
    input: AddRecruitingActivityInput,
  ): Promise<RecruitingActivity> {
    const workflow = this.workflows.find((candidate) => candidate.playerId === playerId);
    if (!workflow) throw new Error(`Recruiting workflow for player ${playerId} not found`);

    const activity = RecruitingActivitySchema.parse({
      ...input,
      id: newId("rwa"),
      workflowId: workflow.id,
      createdAt: input.createdAt ?? new Date().toISOString(),
    });
    workflow.activities.push(activity);
    workflow.updatedAt = activity.createdAt;
    return activity;
  }
}
