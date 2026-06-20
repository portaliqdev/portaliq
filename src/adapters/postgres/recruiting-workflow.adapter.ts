/**
 * Postgres (Neon) recruiting-workflow adapter — persists the recruiting
 * lifecycle so staff status changes, notes, and activity history survive
 * restarts (the mock adapter was in-memory only). Activities live in a jsonb
 * column on the workflow row, mirroring statusHistory/stageHistory elsewhere.
 *
 * Semantics intentionally match MockRecruitingWorkflowRepository so the DI swap
 * is the only difference between backends.
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recruitingWorkflows as wfTbl } from "@/db/schema";
import {
  RecruitingActivitySchema,
  RecruitingWorkflowSchema,
  type RecruitingActivity,
  type RecruitingWorkflow,
  type RecruitingWorkflowFilters,
} from "@/types/recruiting-workflow";
import type {
  AddRecruitingActivityInput,
  AddRecruitingNoteInput,
  CreateRecruitingWorkflowInput,
  RecruitingWorkflowRepository,
  UpdateRecruitingWorkflowInput,
} from "@/repositories/recruiting-workflow.repository";

function clean<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in row) out[k] = row[k] === null ? undefined : row[k];
  return out;
}

/** Map a parsed workflow to column values, nulling absent optionals (drizzle skips undefined). */
function toRow(w: RecruitingWorkflow): typeof wfTbl.$inferInsert {
  return {
    id: w.id,
    orgId: w.orgId,
    playerId: w.playerId,
    playerName: w.playerName,
    position: w.position,
    currentSchoolName: w.currentSchoolName,
    status: w.status,
    priority: w.priority,
    offerStatus: w.offerStatus,
    visitStatus: w.visitStatus,
    riskLevel: w.riskLevel,
    priorityScore: w.priorityScore,
    owner: w.owner ?? null,
    nextAction: w.nextAction ?? null,
    nextActionAt: w.nextActionAt ?? null,
    lastContactAt: w.lastContactAt ?? null,
    visitAt: w.visitAt ?? null,
    offerExtendedAt: w.offerExtendedAt ?? null,
    committedAt: w.committedAt ?? null,
    signedAt: w.signedAt ?? null,
    enrolledAt: w.enrolledAt ?? null,
    activities: w.activities,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

function matchesFilters(w: RecruitingWorkflow, f: RecruitingWorkflowFilters): boolean {
  if (f.orgId && w.orgId !== f.orgId) return false;
  if (f.playerId && w.playerId !== f.playerId) return false;
  if (f.ownerId && w.owner?.id !== f.ownerId) return false;
  if (f.statuses && !f.statuses.includes(w.status)) return false;
  if (f.priorities && !f.priorities.includes(w.priority)) return false;
  if (f.riskLevels && !f.riskLevels.includes(w.riskLevel)) return false;
  return true;
}

let activitySeq = 0;
const newActivityId = () => `rwa_${Date.now().toString(36)}_${(activitySeq++).toString(36)}`;

export class PostgresRecruitingWorkflowRepository implements RecruitingWorkflowRepository {
  private async all(): Promise<RecruitingWorkflow[]> {
    const rows = await db.select().from(wfTbl);
    return rows.map((r) => RecruitingWorkflowSchema.parse(clean(r)));
  }

  async getByPlayerId(playerId: string): Promise<RecruitingWorkflow | null> {
    const rows = await db.select().from(wfTbl).where(eq(wfTbl.playerId, playerId)).limit(1);
    return rows[0] ? RecruitingWorkflowSchema.parse(clean(rows[0])) : null;
  }

  async listByStatus(status: RecruitingWorkflow["status"]) {
    return this.list({ statuses: [status] });
  }

  async listByOwner(owner: string) {
    return (await this.all()).filter((w) => w.owner?.id === owner || w.owner?.name === owner);
  }

  async listNeedsActionToday() {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return (await this.all()).filter(
      (w) => w.nextActionAt && new Date(w.nextActionAt).getTime() <= end.getTime(),
    );
  }

  async list(filters: RecruitingWorkflowFilters = {}): Promise<RecruitingWorkflow[]> {
    const rows = filters.orgId
      ? await db.select().from(wfTbl).where(eq(wfTbl.orgId, filters.orgId)).orderBy(desc(wfTbl.updatedAt))
      : await db.select().from(wfTbl).orderBy(desc(wfTbl.updatedAt));
    return rows
      .map((r) => RecruitingWorkflowSchema.parse(clean(r)))
      .filter((w) => matchesFilters(w, filters))
      .sort((a, b) => (b.priority === "CRITICAL" ? 1 : 0) - (a.priority === "CRITICAL" ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
  }

  async createForPlayer(
    playerId: string,
    input: Omit<CreateRecruitingWorkflowInput, "playerId">,
  ): Promise<RecruitingWorkflow> {
    const now = new Date().toISOString();
    const workflow = RecruitingWorkflowSchema.parse({
      ...input,
      playerId,
      id: `rw_${playerId}`,
      activities: input.activities ?? [],
      createdAt: now,
      updatedAt: now,
    });
    // Idempotent: one workflow per player. If it exists, keep it.
    await db.insert(wfTbl).values(toRow(workflow)).onConflictDoNothing({ target: wfTbl.id });
    return (await this.getByPlayerId(playerId)) ?? workflow;
  }

  async updateWorkflow(playerId: string, patch: UpdateRecruitingWorkflowInput): Promise<RecruitingWorkflow> {
    const existing = await this.getByPlayerId(playerId);
    if (!existing) throw new Error(`Recruiting workflow for player ${playerId} not found`);
    const updated = RecruitingWorkflowSchema.parse({ ...existing, ...patch, updatedAt: new Date().toISOString() });
    const { id: _id, ...row } = toRow(updated);
    await db.update(wfTbl).set(row).where(eq(wfTbl.playerId, playerId));
    return updated;
  }

  async addNote(playerId: string, input: AddRecruitingNoteInput): Promise<RecruitingActivity> {
    return this.addActivity(playerId, {
      type: "NOTE",
      title: "Note added",
      detail: input.text,
      createdBy: input.author,
      createdAt: input.createdAt,
    });
  }

  async addActivity(playerId: string, input: AddRecruitingActivityInput): Promise<RecruitingActivity> {
    const workflow = await this.getByPlayerId(playerId);
    if (!workflow) throw new Error(`Recruiting workflow for player ${playerId} not found`);
    const activity = RecruitingActivitySchema.parse({
      ...input,
      id: newActivityId(),
      workflowId: workflow.id,
      createdAt: input.createdAt ?? new Date().toISOString(),
    });
    await db
      .update(wfTbl)
      .set({ activities: [...workflow.activities, activity], updatedAt: activity.createdAt })
      .where(eq(wfTbl.playerId, playerId));
    return activity;
  }
}
