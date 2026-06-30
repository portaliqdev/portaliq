/**
 * Mock adapters (Phase 1). Implement the repository interfaces against the
 * in-memory seed DB. Async signatures match Firestore exactly so the swap in
 * di.ts is the only change required for Phase 2.
 */
import { db } from "@/lib/mock-data";
import { applyPlayerFilters } from "@/lib/mock-data/query";
import type {
  PlayerRepository,
  CommitAvailabilityInput,
  SchoolRepository,
  EvaluationRepository,
  ScoutingReportRepository,
  RecruitingBoardRepository,
  TeamNeedsRepository,
  RosterRepository,
  WatchlistRepository,
  AIInsightRepository,
  UserRepository,
  OrganizationRepository,
} from "@/repositories";
import type { Player, PlayerFilters, PortalStatus } from "@/types/player";
import type { PlayerStats, PlayerMeasurements, FilmLink, TransferEntry } from "@/types/stats";
import type { StatusEvent } from "@/types/availability";
import type { School, Conference } from "@/types/school";
import type { Evaluation } from "@/types/evaluation";
import type { ScoutingReport } from "@/types/scouting-report";
import type { Board, RecruitingStage, BoardEntry, BoardStage, Watchlist } from "@/types/board";
import type { PositionNeed, DepthChart, RosterSlot, RosterSnapshot } from "@/types/team-needs";
import type { AIInsight, AIInsightKind } from "@/types/ai";
import type { User, StaffRole, Organization } from "@/types/user";
import type { PositionCode } from "@/types/enums";

const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`);

const POSITION_ORDER: PositionCode[] = [
  "QB", "RB", "FB", "WR", "TE", "OT", "OG", "C",
  "EDGE", "DT", "NT", "LB", "ILB", "OLB", "CB", "S", "NB",
  "K", "P", "LS", "KR", "PR",
];

export class MockPlayerRepository implements PlayerRepository {
  async list() { return db.players; }
  async get(id: string) { return db.players.find((p) => p.id === id) ?? null; }
  async getMany(ids: string[]) {
    const set = new Set(ids);
    return db.players.filter((p) => set.has(p.id));
  }
  async queryPlayers(filters: PlayerFilters) { return applyPlayerFilters(db.players, filters); }
  async listByPosition(code: PositionCode) {
    return db.players.filter((p) => p.primaryPosition === code);
  }
  async listByPortalStatus(status: PortalStatus) {
    return db.players.filter((p) => p.portalStatus === status);
  }
  async create(input: Omit<Player, "id">) {
    const player = { ...input, id: newId() } as Player;
    db.players.push(player);
    return player;
  }
  async update(id: string, patch: Partial<Player>) {
    const i = db.players.findIndex((p) => p.id === id);
    if (i < 0) throw new Error(`Player ${id} not found`);
    db.players[i] = { ...db.players[i], ...patch };
    return db.players[i];
  }
  async delete(id: string) {
    const i = db.players.findIndex((p) => p.id === id);
    if (i >= 0) db.players.splice(i, 1);
  }
  async listStats(playerId: string): Promise<PlayerStats[]> {
    return db.stats.filter((s) => s.playerId === playerId).sort((a, b) => b.seasonYear - a.seasonYear);
  }
  async listMeasurements(playerId: string): Promise<PlayerMeasurements[]> {
    return db.measurements.filter((m) => m.playerId === playerId);
  }
  async listFilm(playerId: string): Promise<FilmLink[]> {
    return db.filmLinks.filter((f) => f.playerId === playerId);
  }
  async listTransferEntries(playerId: string): Promise<TransferEntry[]> {
    return db.transferEntries.filter((t) => t.playerId === playerId);
  }
  async commitAvailability(playerId: string, input: CommitAvailabilityInput): Promise<Player> {
    const now = new Date().toISOString();
    const i = db.players.findIndex((p) => p.id === playerId);
    if (i < 0) throw new Error(`Player ${playerId} not found`);
    db.players[i] = { ...db.players[i], ...input.patch, updatedAt: now };
    const player = db.players[i];

    const active = db.transferEntries
      .filter((t) => t.playerId === playerId)
      .sort((a, b) => b.enteredAt.localeCompare(a.enteredAt))[0];
    if (input.effectiveStatus && active && active.status !== input.effectiveStatus) {
      active.status = input.effectiveStatus;
      active.statusHistory = [
        ...active.statusHistory,
        { status: input.effectiveStatus, at: now, source: input.event?.source },
      ];
      active.updatedAt = now;
      if (input.effectiveStatus === "WITHDRAWN" && !active.withdrawnAt) active.withdrawnAt = now;
      if (input.effectiveStatus === "ENROLLED" && !active.enrolledAt) active.enrolledAt = now;
      if (input.effectiveStatus === "COMMITTED" && !active.committedAt) active.committedAt = now;
    }

    if (input.event) {
      db.statusEvents.push({
        ...input.event,
        id: newId(),
        orgId: player.orgId,
        playerId,
        transferEntryId: active?.id,
        createdAt: now,
      });
    }
    return player;
  }
  async listStatusEvents(playerId: string): Promise<StatusEvent[]> {
    return db.statusEvents
      .filter((e) => e.playerId === playerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export class MockSchoolRepository implements SchoolRepository {
  async list() { return db.schools; }
  async get(id: string) { return db.schools.find((s) => s.id === id) ?? null; }
  async getMany(ids: string[]) {
    const set = new Set(ids);
    return db.schools.filter((s) => set.has(s.id));
  }
  async listByConference(conference: Conference) {
    return db.schools.filter((s) => s.conference === conference);
  }
}

export class MockEvaluationRepository implements EvaluationRepository {
  async list() { return db.evaluations; }
  async get(id: string) { return db.evaluations.find((e) => e.id === id) ?? null; }
  async listByPlayer(playerId: string) { return db.evaluations.filter((e) => e.playerId === playerId); }
  async listByEvaluator(evaluatorId: string) { return db.evaluations.filter((e) => e.evaluatorId === evaluatorId); }
  async create(input: Omit<Evaluation, "id">) {
    const e = { ...input, id: newId() } as Evaluation;
    db.evaluations.push(e);
    return e;
  }
  async update(id: string, patch: Partial<Evaluation>) {
    const i = db.evaluations.findIndex((e) => e.id === id);
    if (i < 0) throw new Error(`Evaluation ${id} not found`);
    db.evaluations[i] = { ...db.evaluations[i], ...patch };
    return db.evaluations[i];
  }
  async delete(id: string) {
    const i = db.evaluations.findIndex((e) => e.id === id);
    if (i >= 0) db.evaluations.splice(i, 1);
  }
}

export class MockScoutingReportRepository implements ScoutingReportRepository {
  async list() { return db.scoutingReports; }
  async get(id: string) { return db.scoutingReports.find((r) => r.id === id) ?? null; }
  async listByPlayer(playerId: string) { return db.scoutingReports.filter((r) => r.playerId === playerId); }
  async getLatestForPlayer(playerId: string) {
    const rs = db.scoutingReports.filter((r) => r.playerId === playerId);
    return rs[rs.length - 1] ?? null;
  }
  async create(input: Omit<ScoutingReport, "id">) {
    const r = { ...input, id: newId() } as ScoutingReport;
    db.scoutingReports.push(r);
    return r;
  }
  async update(id: string, patch: Partial<ScoutingReport>) {
    const i = db.scoutingReports.findIndex((r) => r.id === id);
    if (i < 0) throw new Error(`Report ${id} not found`);
    db.scoutingReports[i] = { ...db.scoutingReports[i], ...patch };
    return db.scoutingReports[i];
  }
  async delete(id: string) {
    const i = db.scoutingReports.findIndex((r) => r.id === id);
    if (i >= 0) db.scoutingReports.splice(i, 1);
  }
}

export class MockBoardRepository implements RecruitingBoardRepository {
  async listBoards(orgId: string): Promise<Board[]> {
    return [db.board].filter((b) => b.orgId === orgId);
  }
  async getBoard(boardId: string) { return db.board.id === boardId ? db.board : null; }
  async getDefaultBoard(orgId: string) {
    return db.board.orgId === orgId && db.board.isDefault ? db.board : null;
  }
  async listStages(boardId: string): Promise<RecruitingStage[]> {
    return db.stages.filter((s) => s.boardId === boardId).sort((a, b) => a.order - b.order);
  }
  async listEntries(boardId: string): Promise<BoardEntry[]> {
    return db.boardEntries.filter((e) => e.boardId === boardId);
  }
  async addEntry(boardId: string, input: Omit<BoardEntry, "id">) {
    const e = { ...input, id: newId(), boardId } as BoardEntry;
    db.boardEntries.push(e);
    db.board.entryCount = (db.board.entryCount ?? 0) + 1;
    return e;
  }
  async updateEntry(entryId: string, patch: Partial<BoardEntry>) {
    const i = db.boardEntries.findIndex((e) => e.id === entryId);
    if (i < 0) throw new Error(`Entry ${entryId} not found`);
    db.boardEntries[i] = { ...db.boardEntries[i], ...patch };
    return db.boardEntries[i];
  }
  async moveEntryStage(entryId: string, stage: BoardStage, rank: number) {
    const i = db.boardEntries.findIndex((e) => e.id === entryId);
    if (i < 0) throw new Error(`Entry ${entryId} not found`);
    const stageDoc = db.stages.find((s) => s.canonicalStage === stage);
    const now = new Date().toISOString();
    const entry = db.boardEntries[i];
    db.boardEntries[i] = {
      ...entry,
      stageId: stageDoc?.id ?? entry.stageId,
      canonicalStage: stage,
      rank,
      stageChangedAt: now,
      stageHistory: [
        ...entry.stageHistory,
        { stageId: stageDoc?.id ?? entry.stageId, canonicalStage: stage, at: now },
      ],
    };
    return db.boardEntries[i];
  }
  async removeEntry(entryId: string) {
    const i = db.boardEntries.findIndex((e) => e.id === entryId);
    if (i >= 0) {
      db.boardEntries.splice(i, 1);
      db.board.entryCount = Math.max(0, (db.board.entryCount ?? 1) - 1);
    }
  }
}

export class MockTeamNeedsRepository implements TeamNeedsRepository {
  async listPositionNeeds(orgId: string): Promise<PositionNeed[]> {
    return db.teamNeeds.filter((n) => n.orgId === orgId);
  }
  async upsertPositionNeed(orgId: string, need: PositionNeed) {
    const i = db.teamNeeds.findIndex((n) => n.id === need.id);
    if (i >= 0) db.teamNeeds[i] = need;
    else db.teamNeeds.push(need);
    return need;
  }
  async getDepthChart(orgId: string): Promise<DepthChart> {
    const snap = db.rosterSnapshot;
    const needByPos = new Map(db.teamNeeds.map((n) => [n.position, n]));
    const byPos = new Map<PositionCode, RosterSlot[]>();
    for (const slot of snap.slots) {
      if (!byPos.has(slot.position)) byPos.set(slot.position, []);
      byPos.get(slot.position)!.push(slot);
    }
    const positions = [...byPos.entries()]
      .map(([position, slots]) => ({
        position,
        group: slots[0].positionGroup,
        idealDepth: needByPos.get(position)?.idealDepth ?? slots.length,
        slots: slots.sort((a, b) => a.depthRank - b.depthRank),
      }))
      .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));
    return { orgId, seasonYear: snap.seasonYear, asOf: snap.asOf, positions };
  }
}

export class MockRosterRepository implements RosterRepository {
  async getSnapshot(orgId: string): Promise<RosterSnapshot | null> {
    return db.rosterSnapshot.orgId === orgId ? db.rosterSnapshot : null;
  }
  async listSlots(orgId: string) {
    return db.rosterSnapshot.orgId === orgId ? db.rosterSnapshot.slots : [];
  }
  async listByPosition(orgId: string, code: PositionCode) {
    return db.rosterSnapshot.slots.filter((s) => s.position === code);
  }
}

export class MockWatchlistRepository implements WatchlistRepository {
  async listForOrg(orgId: string) { return db.watchlists.filter((w) => w.orgId === orgId); }
  async listForUser(userId: string) {
    return db.watchlists.filter((w) => w.ownerId === userId || w.isShared);
  }
  async get(id: string) { return db.watchlists.find((w) => w.id === id) ?? null; }
  async toggle(watchlistId: string, playerId: string): Promise<Watchlist> {
    const w = db.watchlists.find((x) => x.id === watchlistId);
    if (!w) throw new Error(`Watchlist ${watchlistId} not found`);
    w.playerIds = w.playerIds.includes(playerId)
      ? w.playerIds.filter((p) => p !== playerId)
      : [...w.playerIds, playerId];
    w.playerCount = w.playerIds.length;
    return w;
  }
}

export class MockAIInsightRepository implements AIInsightRepository {
  async list() { return db.aiInsights; }
  async get(id: string) { return db.aiInsights.find((a) => a.id === id) ?? null; }
  async listByPlayer(playerId: string) { return db.aiInsights.filter((a) => a.playerId === playerId); }
  async getLatestForPlayer(playerId: string) {
    const xs = db.aiInsights.filter((a) => a.playerId === playerId);
    return xs[xs.length - 1] ?? null;
  }
  async listByKind(kind: AIInsightKind) { return db.aiInsights.filter((a) => a.type === kind); }
  async create(input: Omit<AIInsight, "id">) {
    const a = { ...input, id: newId() } as AIInsight;
    db.aiInsights.push(a);
    return a;
  }
  async update(id: string, patch: Partial<AIInsight>) {
    const i = db.aiInsights.findIndex((a) => a.id === id);
    if (i < 0) throw new Error(`Insight ${id} not found`);
    db.aiInsights[i] = { ...db.aiInsights[i], ...patch };
    return db.aiInsights[i];
  }
  async delete(id: string) {
    const i = db.aiInsights.findIndex((a) => a.id === id);
    if (i >= 0) db.aiInsights.splice(i, 1);
  }
}

export class MockUserRepository implements UserRepository {
  async list() { return db.users; }
  async get(id: string) { return db.users.find((u) => u.id === id) ?? null; }
  async getByEmail(email: string) { return db.users.find((u) => u.email === email) ?? null; }
  async listByOrg(orgId: string) { return db.users.filter((u) => u.orgId === orgId); }
  async listByRole(orgId: string, role: StaffRole) {
    return db.users.filter((u) => u.orgId === orgId && u.role === role);
  }
  async getCurrentUser() {
    // Demo session is the head coach so every board action is permitted; the
    // role-gating logic (permissions.ts) still governs the transitions.
    return db.users.find((u) => u.role === "HEAD_COACH") ?? db.users[0];
  }
  async create(input: Omit<User, "id">) {
    const u = { ...input, id: newId() } as User;
    db.users.push(u);
    return u;
  }
  async update(id: string, patch: Partial<User>) {
    const i = db.users.findIndex((u) => u.id === id);
    if (i < 0) throw new Error(`User ${id} not found`);
    db.users[i] = { ...db.users[i], ...patch };
    return db.users[i];
  }
  async delete(id: string) {
    const i = db.users.findIndex((u) => u.id === id);
    if (i >= 0) db.users.splice(i, 1);
  }
}

export class MockOrganizationRepository implements OrganizationRepository {
  async list() { return [db.org]; }
  async get(id: string) { return db.org.id === id ? db.org : null; }
  async getByOrgId(orgId: string) { return db.org.id === orgId ? db.org : null; }
  async getCurrent() { return db.org; }
}

export { MockRecruitingWorkflowRepository } from "./recruiting-workflow.adapter";
