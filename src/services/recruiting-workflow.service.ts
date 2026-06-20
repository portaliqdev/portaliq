import type {
  AddRecruitingActivityInput,
  RecruitingWorkflowRepository,
  UpdateRecruitingWorkflowInput,
} from "@/repositories/recruiting-workflow.repository";
import type { PlayerRepository } from "@/repositories";
import type { Player, PlayerFilters } from "@/types/player";
import type {
  OfferStatus,
  RecruitingPriority,
  RecruitingStatus,
  RecruitingWorkflow,
  StaffOwner,
  VisitStatus,
} from "@/types/recruiting-workflow";

export type WorkflowActor = StaffOwner | string;

export interface RecruitingWorkflowMetrics {
  total: number;
  byStatus: Record<RecruitingStatus, number>;
  byPriority: Record<RecruitingPriority, number>;
  highPriority: number;
  needsActionToday: number;
  contacted: number;
  offersExtended: number;
  visitsScheduled: number;
  committedToUs: number;
  highRisk: number;
  unassigned: number;
  overdueNextActions: number;
  scheduledVisits: number;
  averagePriorityScore: number;
}

export interface ContactInput {
  method: "CALL" | "TEXT" | "EMAIL";
  contactedAt?: string | Date;
  outcome?: string;
  note?: string;
  nextAction?: string;
  nextActionAt?: string | Date;
}

export interface VisitInput {
  visitAt: string | Date;
  status?: Exclude<VisitStatus, "NOT_SCHEDULED">;
  type?: "OFFICIAL" | "UNOFFICIAL";
  location?: string;
  note?: string;
}

export interface OfferInput {
  extendedAt?: string | Date;
  status?: Exclude<OfferStatus, "NOT_EXTENDED" | "UNDER_REVIEW">;
  terms?: string;
  note?: string;
}

const STATUSES = [
  "UNREVIEWED", "EVALUATED", "WATCHLIST", "CONTACTED", "OFFER_EXTENDED",
  "VISIT_SCHEDULED", "COMMITTED_ELSEWHERE", "COMMITTED_TO_US", "REMOVED_NOT_PURSUING",
] as const satisfies readonly RecruitingStatus[];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const satisfies readonly RecruitingPriority[];
const TERMINAL = new Set<RecruitingStatus>([
  "COMMITTED_ELSEWHERE", "COMMITTED_TO_US", "REMOVED_NOT_PURSUING",
]);

const actorStamp = (actor: WorkflowActor): StaffOwner =>
  typeof actor === "string" ? { id: actor, name: actor } : actor;
const iso = (value: string | Date | undefined, fallback = new Date()) => {
  const date = value ? new Date(value) : fallback;
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid workflow date: ${String(value)}`);
  return date.toISOString();
};
const addDays = (value: string, days: number) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

export class RecruitingWorkflowService {
  constructor(
    private repository: RecruitingWorkflowRepository,
    private players?: PlayerRepository,
    private now: () => Date = () => new Date(),
  ) {}

  getWorkflow(playerId: string) { return this.getByPlayer(playerId); }

  async getByPlayer(playerId: string): Promise<RecruitingWorkflow | null> {
    const existing = await this.repository.getByPlayerId(playerId);
    if (existing || !this.players) return existing;
    const player = await this.players.get(playerId);
    return player ? this.createForPlayer(player) : null;
  }

  async listWorkflows(orgId: string) {
    let workflows = await this.repository.list({ orgId });
    // Lazily materialize workflows for tracked players so list-based consumers
    // (AI tools, portal, board) stay consistent with getMetrics.
    if (!workflows.length && this.players) {
      workflows = await this.ensureForPlayers([...await this.players.list()].sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0)).slice(0, 120));
    }
    return workflows;
  }

  async ensureForPlayers(players: Player[]) {
    return Promise.all(players.map(async (player) =>
      (await this.repository.getByPlayerId(player.id)) ?? this.createForPlayer(player)
    ));
  }

  async queryPlayers(filters: PlayerFilters = {}) {
    if (!this.players) return this.repository.list();
    return this.ensureForPlayers(await this.players.queryPlayers(filters));
  }

  async getMetrics(orgId: string): Promise<RecruitingWorkflowMetrics> {
    let workflows = await this.repository.list({ orgId });
    if (!workflows.length && this.players) {
      workflows = await this.ensureForPlayers([...await this.players.list()].sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0)).slice(0, 120));
    }
    const due = await this.repository.listNeedsActionToday();
    const nowMs = this.now().getTime();
    const scores = workflows.map((workflow) => this.calculatePriorityScore(workflow));
    return {
      total: workflows.length,
      byStatus: Object.fromEntries(STATUSES.map((status) => [
        status, workflows.filter((workflow) => workflow.status === status).length,
      ])) as Record<RecruitingStatus, number>,
      byPriority: Object.fromEntries(PRIORITIES.map((priority) => [
        priority, workflows.filter((workflow) => workflow.priority === priority).length,
      ])) as Record<RecruitingPriority, number>,
      highPriority: workflows.filter((w) => ["HIGH", "CRITICAL"].includes(w.priority)).length,
      needsActionToday: due.length,
      contacted: workflows.filter((w) => w.status === "CONTACTED").length,
      offersExtended: workflows.filter((w) => w.status === "OFFER_EXTENDED").length,
      visitsScheduled: workflows.filter((w) => w.status === "VISIT_SCHEDULED").length,
      committedToUs: workflows.filter((w) => w.status === "COMMITTED_TO_US").length,
      highRisk: workflows.filter((w) => w.riskLevel === "HIGH").length,
      unassigned: workflows.filter((w) => !w.owner).length,
      overdueNextActions: workflows.filter((w) =>
        w.nextActionAt && !TERMINAL.has(w.status) && new Date(w.nextActionAt).getTime() < nowMs
      ).length,
      scheduledVisits: workflows.filter((w) => w.visitStatus === "SCHEDULED").length,
      averagePriorityScore: scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0,
    };
  }

  metrics(orgId: string) { return this.getMetrics(orgId); }

  async updateStatus(playerOrWorkflowId: string, status: RecruitingStatus, actor: WorkflowActor, note?: string) {
    const workflow = await this.requireWorkflow(playerOrWorkflowId);
    this.assertTransition(workflow.status, status);
    const patch: UpdateRecruitingWorkflowInput = { status };
    if (TERMINAL.has(status)) {
      patch.nextAction = undefined;
      patch.nextActionAt = undefined;
    }
    return this.updateWithActivity(workflow, patch, "STATUS_CHANGE", `Status changed to ${status}`, actor, workflow.status, status, note);
  }

  async assignOwner(playerOrWorkflowId: string, owner: StaffOwner | undefined, actor: WorkflowActor, note?: string) {
    const workflow = await this.requireWorkflow(playerOrWorkflowId);
    return this.updateWithActivity(workflow, { owner }, "OWNER_CHANGE", owner ? `Assigned to ${owner.name}` : "Owner unassigned", actor, workflow.owner, owner, note);
  }

  async updatePriority(playerOrWorkflowId: string, priority: RecruitingPriority, actor: WorkflowActor, note?: string) {
    const workflow = await this.requireWorkflow(playerOrWorkflowId);
    return this.updateWithActivity(workflow, { priority }, "PRIORITY_CHANGE", `Priority changed to ${priority}`, actor, workflow.priority, priority, note);
  }

  async addNote(playerOrWorkflowId: string, note: string, actor: WorkflowActor) {
    if (!note.trim()) throw new Error("A workflow note cannot be empty.");
    const workflow = await this.requireWorkflow(playerOrWorkflowId);
    await this.repository.addNote(workflow.playerId, { text: note.trim(), author: actorStamp(actor), createdAt: this.timestamp() });
    return this.requireWorkflow(workflow.playerId);
  }

  async logContact(playerOrWorkflowId: string, contact: ContactInput, actor: WorkflowActor) {
    const workflow = await this.requireWorkflow(playerOrWorkflowId);
    const contactedAt = iso(contact.contactedAt, this.now());
    const patch: UpdateRecruitingWorkflowInput = {
      status: "CONTACTED",
      lastContactAt: contactedAt,
      nextAction: contact.nextAction ?? "Follow up with prospect",
      nextActionAt: contact.nextActionAt ? iso(contact.nextActionAt, this.now()) : addDays(contactedAt, 2),
    };
    return this.updateWithActivity(workflow, patch, contact.method, `${contact.method.toLowerCase()} contact logged`, actor, workflow.lastContactAt, contactedAt, contact.note ?? contact.outcome);
  }

  async scheduleVisit(playerOrWorkflowId: string, visit: VisitInput, actor: WorkflowActor) {
    const workflow = await this.requireWorkflow(playerOrWorkflowId);
    const visitAt = iso(visit.visitAt, this.now());
    return this.updateWithActivity(
      workflow,
      { status: "VISIT_SCHEDULED", visitStatus: visit.status ?? "SCHEDULED", visitAt, nextAction: "Prepare for prospect visit", nextActionAt: visitAt },
      "VISIT", "Visit scheduled", actor, workflow.visitAt, visitAt, visit.note,
    );
  }

  async markOfferExtended(playerOrWorkflowId: string, actor: WorkflowActor, offer: OfferInput = {}) {
    const workflow = await this.requireWorkflow(playerOrWorkflowId);
    const extendedAt = iso(offer.extendedAt, this.now());
    return this.updateWithActivity(
      workflow,
      { status: "OFFER_EXTENDED", offerStatus: offer.status ?? "EXTENDED", offerExtendedAt: extendedAt, nextAction: "Follow up on offer", nextActionAt: addDays(extendedAt, 1) },
      "OFFER", "Offer extended", actor, workflow.offerStatus, offer.status ?? "EXTENDED", offer.note ?? offer.terms,
    );
  }

  async updateNextAction(playerOrWorkflowId: string, next: { action?: string; dueAt?: string | Date; note?: string }, actor: WorkflowActor) {
    const workflow = await this.requireWorkflow(playerOrWorkflowId);
    const dueAt = next.dueAt ? iso(next.dueAt, this.now()) : undefined;
    return this.updateWithActivity(
      workflow, { nextAction: next.action?.trim() || undefined, nextActionAt: dueAt },
      "SYSTEM", next.action ? `Next action: ${next.action}` : "Next action cleared", actor,
      { action: workflow.nextAction, dueAt: workflow.nextActionAt }, { action: next.action, dueAt }, next.note,
    );
  }

  calculatePriorityScore(workflow: RecruitingWorkflow) {
    if (TERMINAL.has(workflow.status)) return 0;
    const priority = { LOW: 20, MEDIUM: 40, HIGH: 65, CRITICAL: 80 }[workflow.priority];
    const risk = { NONE: 0, LOW: 2, MEDIUM: 5, HIGH: 10 }[workflow.riskLevel];
    const due = workflow.nextActionAt && new Date(workflow.nextActionAt).getTime() <= this.now().getTime() ? 10 : 0;
    return Math.min(100, priority + risk + due);
  }

  private async requireWorkflow(id: string) {
    const byPlayer = await this.repository.getByPlayerId(id);
    if (byPlayer) return byPlayer;
    const byId = (await this.repository.list()).find((workflow) => workflow.id === id);
    if (!byId) throw new Error(`Recruiting workflow not found: ${id}`);
    return byId;
  }

  private async updateWithActivity(
    workflow: RecruitingWorkflow,
    patch: UpdateRecruitingWorkflowInput,
    type: AddRecruitingActivityInput["type"],
    title: string,
    actor: WorkflowActor,
    previousValue: unknown,
    newValue: unknown,
    note?: string,
  ) {
    await this.repository.updateWorkflow(workflow.playerId, {
      ...patch,
      priorityScore: patch.priority || patch.status
        ? this.calculatePriorityScore({ ...workflow, ...patch } as RecruitingWorkflow)
        : workflow.priorityScore,
    });
    const person = actorStamp(actor);
    await this.repository.addActivity(workflow.playerId, {
      type,
      title,
      detail: note,
      actor: person,
      createdBy: person,
      previousValue,
      newValue,
      note,
      createdAt: this.timestamp(),
      metadata: { previous: previousValue, new: newValue, note },
    });
    return this.requireWorkflow(workflow.playerId);
  }

  private assertTransition(previous: RecruitingStatus, next: RecruitingStatus) {
    if (previous !== next && TERMINAL.has(previous)) {
      throw new Error(`Cannot transition a terminal workflow from ${previous} to ${next}.`);
    }
  }

  private timestamp() { return this.now().toISOString(); }

  private createForPlayer(player: Player) {
    const now = this.timestamp();
    return this.repository.createForPlayer(player.id, {
      orgId: player.orgId,
      playerName: player.fullName,
      position: player.primaryPosition,
      currentSchoolName: player.currentSchool.name,
      status: "UNREVIEWED",
      priority: (player.fitScore ?? 0) >= 80 ? "HIGH" : "MEDIUM",
      priorityScore: player.fitScore ?? 50,
      offerStatus: "NOT_EXTENDED",
      visitStatus: "NOT_SCHEDULED",
      riskLevel: "LOW",
      nextAction: "Review player profile",
      nextActionAt: addDays(now, 1),
    });
  }
}
