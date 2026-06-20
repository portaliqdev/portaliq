import type {
  RecruitingActivity,
  RecruitingActivityType,
  RecruitingWorkflow,
  RecruitingWorkflowFilters,
  StaffOwner,
} from "@/types/recruiting-workflow";

export type CreateRecruitingWorkflowInput = Omit<
  RecruitingWorkflow,
  "id" | "activities" | "createdAt" | "updatedAt"
> & {
  activities?: RecruitingActivity[];
};

export type UpdateRecruitingWorkflowInput = Partial<
  Omit<
    RecruitingWorkflow,
    "id" | "orgId" | "playerId" | "activities" | "createdAt" | "updatedAt"
  >
>;

export interface AddRecruitingNoteInput {
  text: string;
  author?: StaffOwner;
  createdAt?: string;
}

export type AddRecruitingActivityInput = Omit<
  RecruitingActivity,
  "id" | "workflowId" | "createdAt"
> & {
  type: RecruitingActivityType;
  createdAt?: string;
};

export interface RecruitingWorkflowRepository {
  getByPlayerId(playerId: string): Promise<RecruitingWorkflow | null>;
  listByStatus(status: RecruitingWorkflow["status"]): Promise<RecruitingWorkflow[]>;
  listByOwner(owner: string): Promise<RecruitingWorkflow[]>;
  listNeedsActionToday(): Promise<RecruitingWorkflow[]>;
  list(filters?: RecruitingWorkflowFilters): Promise<RecruitingWorkflow[]>;
  createForPlayer(
    playerId: string,
    input: Omit<CreateRecruitingWorkflowInput, "playerId">,
  ): Promise<RecruitingWorkflow>;
  updateWorkflow(
    playerId: string,
    patch: UpdateRecruitingWorkflowInput,
  ): Promise<RecruitingWorkflow>;
  addNote(
    playerId: string,
    input: AddRecruitingNoteInput,
  ): Promise<RecruitingActivity>;
  addActivity(
    playerId: string,
    input: AddRecruitingActivityInput,
  ): Promise<RecruitingActivity>;
}
