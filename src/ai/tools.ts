/**
 * Grounded "tools" the assistant can call — the Phase-1 analogue of Phase-2
 * function calling. Every tool is repo/service backed, so answers are grounded
 * in real player data and never invented.
 */
import type { PlayerRepository, OrganizationRepository } from "@/repositories";
import type { SearchService, PlayerDetail } from "@/services/search.service";
import type { TeamNeedsService } from "@/services/team-needs.service";
import type { Player, PlayerFilters } from "@/types/player";
import type { PositionNeed } from "@/types/team-needs";
import type { Organization } from "@/types/user";
import type { BoardEntry } from "@/types/board";
import type { PositionCode } from "@/types/enums";
import type {
  RecruitingWorkflowService,
} from "@/services/recruiting-workflow.service";
import type { RecruitingWorkflow } from "@/types/recruiting-workflow";

/**
 * Normalized workflow record consumed by the mock provider. The workflow
 * service may attach richer fields; this deliberately captures only the
 * evidence needed to explain a recommendation.
 */
export interface WorkflowPlayerRecord {
  player: Player;
  boardEntry?: BoardEntry;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  daysSinceContact?: number;
  priorityScore?: number;
  reasons?: string[];
  workflow?: RecruitingWorkflow;
}

export interface WorkflowBoardSummary {
  position?: PositionCode;
  total: number;
  stageCounts: Record<string, number>;
  ownedCount: number;
  unownedCount: number;
  averageFitScore?: number;
  records: WorkflowPlayerRecord[];
}

export interface PortalTools {
  searchPlayers(filters: PlayerFilters): Promise<Player[]>;
  getPlayer(id: string): Promise<Player | null>;
  comparePlayers(ids: string[]): Promise<Player[]>;
  getTeamNeeds(): Promise<PositionNeed[]>;
  findSimilarPlayers(playerId: string, n?: number): Promise<Player[]>;
  getPlayerDetail(id: string): Promise<PlayerDetail | null>;
  getOrg(): Promise<Organization>;
  hasWorkflowSupport?(): boolean;
  getFollowUpsDueToday?(asOf?: string): Promise<WorkflowPlayerRecord[]>;
  getTopUncontactedTargets?(position?: PositionCode, limit?: number): Promise<WorkflowPlayerRecord[]>;
  getHighPriorityPlayersWithoutOwner?(limit?: number): Promise<WorkflowPlayerRecord[]>;
  summarizeRecruitingBoard?(position?: PositionCode): Promise<WorkflowBoardSummary | null>;
  getEvaluatedToWatchlistCandidates?(limit?: number): Promise<WorkflowPlayerRecord[]>;
}

export class MockPortalTools implements PortalTools {
  constructor(
    private search: SearchService,
    private teamNeeds: TeamNeedsService,
    private players: PlayerRepository,
    private orgs: OrganizationRepository,
    private workflow?: RecruitingWorkflowService,
  ) {}

  searchPlayers(filters: PlayerFilters) { return this.search.searchPortal(filters); }
  getPlayer(id: string) { return this.players.get(id); }
  comparePlayers(ids: string[]) { return this.search.compare(ids); }
  async getTeamNeeds() {
    const org = await this.orgs.getCurrent();
    return (await this.teamNeeds.getNeedsView(org.id)).needs;
  }
  findSimilarPlayers(playerId: string, n = 6) { return this.search.similar(playerId, n); }
  getPlayerDetail(id: string) { return this.search.getPlayerDetail(id); }
  getOrg() { return this.orgs.getCurrent(); }

  hasWorkflowSupport() { return Boolean(this.workflow); }

  private async callWorkflow(names: string[], options: Record<string, unknown>): Promise<unknown> {
    if (!this.workflow) return null;
    const service = this.workflow as unknown as Record<string, unknown>;
    const methodName = names.find((name) => typeof service[name] === "function");
    if (!methodName) return null;
    const org = await this.orgs.getCurrent();
    const method = service[methodName] as (orgId: string, options: Record<string, unknown>) => Promise<unknown>;
    return method.call(this.workflow, org.id, options);
  }

  private async listWorkflowRecords(): Promise<RecruitingWorkflow[]> {
    const value = await this.callWorkflow(
      ["listWorkflows", "getWorkflows", "listForOrg"],
      {},
    );
    if (Array.isArray(value)) return value as RecruitingWorkflow[];

    // The initial workflow service exposes record-by-id and aggregate metrics
    // while retaining its repository privately. Read through that repository
    // as a compatibility fallback until a public list/query method is wired.
    if (!this.workflow) return [];
    const org = await this.orgs.getCurrent();
    const repository = (this.workflow as unknown as {
      repository?: { list?: (filters: { orgId: string }) => Promise<RecruitingWorkflow[]> };
    }).repository;
    return repository?.list ? repository.list({ orgId: org.id }) : [];
  }

  private async normalizeRecords(value: unknown): Promise<WorkflowPlayerRecord[]> {
    const source = Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? (
            (value as { records?: unknown }).records
            ?? (value as { players?: unknown }).players
            ?? (value as { items?: unknown }).items
          )
        : [];
    if (!Array.isArray(source)) return [];

    const records = await Promise.all(source.map(async (item): Promise<WorkflowPlayerRecord | null> => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<WorkflowPlayerRecord> & {
        playerId?: string;
        entry?: BoardEntry;
        id?: string;
        status?: string;
        ownerId?: string | null;
        owner?: { id?: string; name?: string };
        priority?: string;
        nextActionAt?: string | null;
      };
      const workflow = candidate.workflow
        ?? ("status" in candidate && "playerId" in candidate ? candidate as unknown as RecruitingWorkflow : undefined);
      const embeddedPlayer = candidate.player;
      const playerId = embeddedPlayer?.id
        ?? candidate.playerId
        ?? workflow?.playerId
        ?? candidate.boardEntry?.playerId
        ?? candidate.entry?.playerId;
      const player = embeddedPlayer ?? (playerId ? await this.players.get(playerId) : null);
      if (!player) return null;
      const lastContactAt = candidate.lastContactAt ?? workflow?.lastContactAt ?? undefined;
      const lastContactMs = lastContactAt ? new Date(lastContactAt).getTime() : NaN;
      return {
        ...candidate,
        player,
        boardEntry: candidate.boardEntry ?? candidate.entry,
        workflow,
        lastContactAt: lastContactAt ?? undefined,
        nextFollowUpAt: candidate.nextFollowUpAt ?? workflow?.nextActionAt ?? undefined,
        daysSinceContact: candidate.daysSinceContact ?? (Number.isFinite(lastContactMs)
          ? Math.max(0, Math.floor((Date.now() - lastContactMs) / 86_400_000))
          : undefined),
        priorityScore: candidate.priorityScore ?? (workflow && this.workflow
          ? this.workflow.calculatePriorityScore(workflow)
          : undefined),
      };
    }));
    return records.filter((record): record is WorkflowPlayerRecord => Boolean(record));
  }

  async getFollowUpsDueToday(asOf = new Date().toISOString()) {
    let value = await this.callWorkflow(
      ["getFollowUpsDueToday", "listFollowUpsDueToday", "getFollowUpQueue"],
      { asOf },
    );
    if (!value) {
      const workflows = await this.listWorkflowRecords();
      const date = new Date(asOf);
      const endOfDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1) - 1;
      value = workflows.filter((workflow) => {
        if (!workflow.nextActionAt || ["COMMITTED_ELSEWHERE", "COMMITTED_TO_US", "REMOVED_NOT_PURSUING"].includes(workflow.status)) return false;
        const due = new Date(workflow.nextActionAt).getTime();
        return Number.isFinite(due) && due <= endOfDay;
      });
    }
    return (await this.normalizeRecords(value))
      .sort((a, b) => (a.nextFollowUpAt ?? "").localeCompare(b.nextFollowUpAt ?? ""));
  }

  async getTopUncontactedTargets(position?: PositionCode, limit = 10) {
    let value = await this.callWorkflow(
      ["getTopUncontactedTargets", "getUncontactedTargets", "listUncontactedTargets"],
      { position, limit },
    );
    if (!value) {
      value = (await this.listWorkflowRecords()).filter((workflow) =>
        !workflow.lastContactAt
        && !["COMMITTED_ELSEWHERE", "COMMITTED_TO_US", "REMOVED_NOT_PURSUING"].includes(workflow.status)
      );
    }
    return (await this.normalizeRecords(value))
      .filter((record) => !position || record.player.primaryPosition === position)
      .sort((a, b) =>
        (b.priorityScore ?? b.player.fitScore ?? 0) - (a.priorityScore ?? a.player.fitScore ?? 0)
      )
      .slice(0, limit);
  }

  async getHighPriorityPlayersWithoutOwner(limit = 10) {
    let value = await this.callWorkflow(
      ["getHighPriorityPlayersWithoutOwner", "getHighPriorityUnownedPlayers", "listUnassignedPriorityPlayers"],
      { limit },
    );
    if (!value) {
      value = (await this.listWorkflowRecords()).filter((workflow) =>
        ["CRITICAL", "HIGH"].includes(String(workflow.priority))
        && !workflow.owner
      );
    }
    return (await this.normalizeRecords(value))
      .sort((a, b) => (b.priorityScore ?? b.player.fitScore ?? 0) - (a.priorityScore ?? a.player.fitScore ?? 0))
      .slice(0, limit);
  }

  async summarizeRecruitingBoard(position?: PositionCode): Promise<WorkflowBoardSummary | null> {
    let value = await this.callWorkflow(
      ["summarizeRecruitingBoard", "summarizeBoard", "getBoardSummary", "summarizePositionBoard"],
      { position },
    );
    if (!value) value = await this.listWorkflowRecords();
    if (!value) return null;
    const records = (await this.normalizeRecords(value))
      .filter((record) => !position || record.player.primaryPosition === position);
    const supplied = value && typeof value === "object" ? value as Partial<WorkflowBoardSummary> : {};
    const stageCounts = supplied.stageCounts ?? records.reduce<Record<string, number>>((counts, record) => {
      const stage = record.workflow?.status ?? record.boardEntry?.canonicalStage;
      if (stage) counts[stage] = (counts[stage] ?? 0) + 1;
      return counts;
    }, {});
    const ownedCount = supplied.ownedCount ?? records.filter((record) =>
      record.boardEntry?.assignedToId
      || record.workflow?.owner
    ).length;
    const total = position ? records.length : supplied.total ?? records.length;
    const fits = records.map((record) => record.player.fitScore).filter((score): score is number => score != null);
    return {
      position: supplied.position ?? position,
      total,
      stageCounts,
      ownedCount,
      unownedCount: supplied.unownedCount ?? Math.max(0, total - ownedCount),
      averageFitScore: supplied.averageFitScore ?? (fits.length
        ? Math.round(fits.reduce((sum, score) => sum + score, 0) / fits.length)
        : undefined),
      records,
    };
  }

  async getEvaluatedToWatchlistCandidates(limit = 10) {
    let value = await this.callWorkflow(
      ["getEvaluatedToWatchlistCandidates", "getWatchlistMoveCandidates", "listEvaluatedWatchlistCandidates"],
      { limit },
    );
    if (!value) {
      value = (await this.listWorkflowRecords()).filter((workflow) =>
        workflow.status === "EVALUATED"
      );
    }
    return (await this.normalizeRecords(value))
      .map((record) => ({
        ...record,
        reasons: record.reasons?.length
          ? record.reasons
          : [
              `Evaluation is active with fit ${record.player.fitScore ?? "unscored"}`,
              record.workflow?.priority ? `${record.workflow.priority} workflow priority` : "Workflow evaluation pending",
            ],
      }))
      .sort((a, b) => (b.player.fitScore ?? 0) - (a.player.fitScore ?? 0))
      .slice(0, limit);
  }
}
