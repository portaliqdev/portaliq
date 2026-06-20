/**
 * Postgres (Neon) adapters — Phase 4. Implement the DATA-PLANE repository
 * interfaces against the real ingested + AI-evaluated tables. The org-workflow
 * repos (board, team needs, roster, watchlists, users, orgs) have no ingested
 * source yet, so di.ts pairs these with the mock implementations for those.
 *
 * Row → domain: Drizzle returns SQL NULLs as `null`, but the Zod domain types
 * use optional (`undefined`) fields — so every row is null-stripped and parsed
 * through its schema, which also guarantees shape parity with the mock backend.
 */
import { eq, inArray, desc, and } from "drizzle-orm";
import { db } from "@/db/client";
import {
  players as playersTbl,
  playerStats as playerStatsTbl,
  playerMeasurements as measurementsTbl,
  filmLinks as filmTbl,
  transferEntries as transferTbl,
  schools as schoolsTbl,
  evaluations as evaluationsTbl,
  aiInsights as aiInsightsTbl,
  rosterSlots as rosterSlotsTbl,
  rosterSnapshots as rosterSnapshotsTbl,
  teamNeeds as teamNeedsTbl,
  boards as boardsTbl,
  recruitingStages as stagesTbl,
  boardEntries as boardEntriesTbl,
  watchlists as watchlistsTbl,
} from "@/db/schema";
import { applyPlayerFilters } from "@/lib/mock-data/query";
import { PlayerSchema, type Player, type PlayerFilters, type PortalStatus } from "@/types/player";
import {
  PlayerStatsSchema,
  PlayerMeasurementsSchema,
  FilmLinkSchema,
  TransferEntrySchema,
  type PlayerStats,
  type PlayerMeasurements,
  type FilmLink,
  type TransferEntry,
} from "@/types/stats";
import { SchoolSchema, type School, type Conference } from "@/types/school";
import { EvaluationSchema, type Evaluation } from "@/types/evaluation";
import { AIInsightSchema, type AIInsight, type AIInsightKind } from "@/types/ai";
import {
  RosterSlotSchema,
  RosterSnapshotSchema,
  PositionNeedSchema,
  type RosterSlot,
  type RosterSnapshot,
  type PositionNeed,
  type DepthChart,
} from "@/types/team-needs";
import {
  RecruitingStageSchema,
  BoardSchema,
  BoardEntrySchema,
  WatchlistSchema,
  type Board,
  type RecruitingStage,
  type BoardEntry,
  type BoardStage,
  type Watchlist,
} from "@/types/board";
import type {
  PlayerRepository,
  SchoolRepository,
  EvaluationRepository,
  ScoutingReportRepository,
  AIInsightRepository,
  RosterRepository,
  TeamNeedsRepository,
  RecruitingBoardRepository,
  WatchlistRepository,
  Repositories,
} from "@/repositories";
import type { ScoutingReport } from "@/types/scouting-report";
import type { PositionCode } from "@/types/enums";
import { MockUserRepository, MockOrganizationRepository } from "@/adapters/mock";
import { PostgresRecruitingWorkflowRepository } from "./recruiting-workflow.adapter";

const POSITION_ORDER: PositionCode[] = [
  "QB", "RB", "FB", "WR", "TE", "OT", "OG", "C",
  "EDGE", "DT", "NT", "LB", "ILB", "OLB", "CB", "S", "NB",
  "K", "P", "LS", "KR", "PR",
];

/** SQL NULL → undefined, then validate/normalize through the Zod schema. */
function clean<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in row) out[k] = row[k] === null ? undefined : row[k];
  return out;
}

const NOT_IMPLEMENTED = (what: string) => () => {
  throw new Error(`Postgres adapter: ${what} is not implemented yet`);
};

class PostgresPlayerRepository implements PlayerRepository {
  async list(): Promise<Player[]> {
    const rows = await db.select().from(playersTbl);
    return rows.map((r) => PlayerSchema.parse(clean(r)));
  }
  async get(id: string): Promise<Player | null> {
    const rows = await db.select().from(playersTbl).where(eq(playersTbl.id, id)).limit(1);
    return rows[0] ? PlayerSchema.parse(clean(rows[0])) : null;
  }
  async getMany(ids: string[]): Promise<Player[]> {
    if (ids.length === 0) return [];
    const rows = await db.select().from(playersTbl).where(inArray(playersTbl.id, ids));
    return rows.map((r) => PlayerSchema.parse(clean(r)));
  }
  async queryPlayers(filters: PlayerFilters): Promise<Player[]> {
    return applyPlayerFilters(await this.list(), filters);
  }
  async listByPosition(code: PositionCode): Promise<Player[]> {
    const rows = await db.select().from(playersTbl).where(eq(playersTbl.primaryPosition, code));
    return rows.map((r) => PlayerSchema.parse(clean(r)));
  }
  async listByPortalStatus(status: PortalStatus): Promise<Player[]> {
    const rows = await db.select().from(playersTbl).where(eq(playersTbl.portalStatus, status));
    return rows.map((r) => PlayerSchema.parse(clean(r)));
  }
  async listStats(playerId: string): Promise<PlayerStats[]> {
    const rows = await db
      .select()
      .from(playerStatsTbl)
      .where(eq(playerStatsTbl.playerId, playerId))
      .orderBy(desc(playerStatsTbl.seasonYear));
    return rows.map((r) => PlayerStatsSchema.parse(clean(r)));
  }
  async listMeasurements(playerId: string): Promise<PlayerMeasurements[]> {
    const rows = await db.select().from(measurementsTbl).where(eq(measurementsTbl.playerId, playerId));
    return rows.map((r) => PlayerMeasurementsSchema.parse(clean(r)));
  }
  async listFilm(playerId: string): Promise<FilmLink[]> {
    const rows = await db.select().from(filmTbl).where(eq(filmTbl.playerId, playerId));
    return rows.map((r) => FilmLinkSchema.parse(clean(r)));
  }
  async listTransferEntries(playerId: string): Promise<TransferEntry[]> {
    const rows = await db.select().from(transferTbl).where(eq(transferTbl.playerId, playerId));
    return rows.map((r) => TransferEntrySchema.parse(clean(r)));
  }
  async update(id: string, patch: Partial<Omit<Player, "id">>): Promise<Player> {
    await db
      .update(playersTbl)
      .set({ ...patch, updatedAt: new Date().toISOString() } as Partial<typeof playersTbl.$inferInsert>)
      .where(eq(playersTbl.id, id));
    const updated = await this.get(id);
    if (!updated) throw new Error(`Player ${id} not found`);
    return updated;
  }
  create = NOT_IMPLEMENTED("players.create") as PlayerRepository["create"];
  delete = NOT_IMPLEMENTED("players.delete") as PlayerRepository["delete"];
}

class PostgresSchoolRepository implements SchoolRepository {
  async list(): Promise<School[]> {
    const rows = await db.select().from(schoolsTbl);
    return rows.map((r) => SchoolSchema.parse(clean(r)));
  }
  async get(id: string): Promise<School | null> {
    const rows = await db.select().from(schoolsTbl).where(eq(schoolsTbl.id, id)).limit(1);
    return rows[0] ? SchoolSchema.parse(clean(rows[0])) : null;
  }
  async getMany(ids: string[]): Promise<School[]> {
    if (ids.length === 0) return [];
    const rows = await db.select().from(schoolsTbl).where(inArray(schoolsTbl.id, ids));
    return rows.map((r) => SchoolSchema.parse(clean(r)));
  }
  async listByConference(conference: Conference): Promise<School[]> {
    const rows = await db.select().from(schoolsTbl).where(eq(schoolsTbl.conference, conference));
    return rows.map((r) => SchoolSchema.parse(clean(r)));
  }
}

class PostgresEvaluationRepository implements EvaluationRepository {
  async list(): Promise<Evaluation[]> {
    const rows = await db.select().from(evaluationsTbl);
    return rows.map((r) => EvaluationSchema.parse(clean(r)));
  }
  async get(id: string): Promise<Evaluation | null> {
    const rows = await db.select().from(evaluationsTbl).where(eq(evaluationsTbl.id, id)).limit(1);
    return rows[0] ? EvaluationSchema.parse(clean(rows[0])) : null;
  }
  async listByPlayer(playerId: string): Promise<Evaluation[]> {
    const rows = await db.select().from(evaluationsTbl).where(eq(evaluationsTbl.playerId, playerId));
    return rows.map((r) => EvaluationSchema.parse(clean(r)));
  }
  async listByEvaluator(evaluatorId: string): Promise<Evaluation[]> {
    const rows = await db.select().from(evaluationsTbl).where(eq(evaluationsTbl.evaluatorId, evaluatorId));
    return rows.map((r) => EvaluationSchema.parse(clean(r)));
  }
  create = NOT_IMPLEMENTED("evaluations.create") as EvaluationRepository["create"];
  update = NOT_IMPLEMENTED("evaluations.update") as EvaluationRepository["update"];
  delete = NOT_IMPLEMENTED("evaluations.delete") as EvaluationRepository["delete"];
}

/** No scouting_reports source yet — empty reads, parity with the interface. */
class PostgresScoutingReportRepository implements ScoutingReportRepository {
  async list(): Promise<ScoutingReport[]> { return []; }
  async get(): Promise<ScoutingReport | null> { return null; }
  async listByPlayer(): Promise<ScoutingReport[]> { return []; }
  async getLatestForPlayer(): Promise<ScoutingReport | null> { return null; }
  create = NOT_IMPLEMENTED("scoutingReports.create") as ScoutingReportRepository["create"];
  update = NOT_IMPLEMENTED("scoutingReports.update") as ScoutingReportRepository["update"];
  delete = NOT_IMPLEMENTED("scoutingReports.delete") as ScoutingReportRepository["delete"];
}

class PostgresAIInsightRepository implements AIInsightRepository {
  async list(): Promise<AIInsight[]> {
    const rows = await db.select().from(aiInsightsTbl);
    return rows.map((r) => AIInsightSchema.parse(clean(r)));
  }
  async get(id: string): Promise<AIInsight | null> {
    const rows = await db.select().from(aiInsightsTbl).where(eq(aiInsightsTbl.id, id)).limit(1);
    return rows[0] ? AIInsightSchema.parse(clean(rows[0])) : null;
  }
  async listByPlayer(playerId: string): Promise<AIInsight[]> {
    const rows = await db.select().from(aiInsightsTbl).where(eq(aiInsightsTbl.playerId, playerId));
    return rows.map((r) => AIInsightSchema.parse(clean(r)));
  }
  async getLatestForPlayer(playerId: string): Promise<AIInsight | null> {
    const rows = await db
      .select()
      .from(aiInsightsTbl)
      .where(eq(aiInsightsTbl.playerId, playerId))
      .orderBy(desc(aiInsightsTbl.generatedAt))
      .limit(1);
    return rows[0] ? AIInsightSchema.parse(clean(rows[0])) : null;
  }
  async listByKind(kind: AIInsightKind): Promise<AIInsight[]> {
    const rows = await db.select().from(aiInsightsTbl).where(eq(aiInsightsTbl.type, kind));
    return rows.map((r) => AIInsightSchema.parse(clean(r)));
  }
  create = NOT_IMPLEMENTED("aiInsights.create") as AIInsightRepository["create"];
  update = NOT_IMPLEMENTED("aiInsights.update") as AIInsightRepository["update"];
  delete = NOT_IMPLEMENTED("aiInsights.delete") as AIInsightRepository["delete"];
}

class PostgresRosterRepository implements RosterRepository {
  async getSnapshot(orgId: string): Promise<RosterSnapshot | null> {
    const snap = await db.select().from(rosterSnapshotsTbl).where(eq(rosterSnapshotsTbl.orgId, orgId)).limit(1);
    if (!snap[0]) return null;
    const slots = await this.listSlots(orgId);
    return RosterSnapshotSchema.parse({ ...clean(snap[0]), slots });
  }
  async listSlots(orgId: string): Promise<RosterSlot[]> {
    const rows = await db.select().from(rosterSlotsTbl).where(eq(rosterSlotsTbl.orgId, orgId));
    return rows.map((r) => RosterSlotSchema.parse(clean(r))).sort((a, b) => a.depthRank - b.depthRank);
  }
  async listByPosition(orgId: string, code: PositionCode): Promise<RosterSlot[]> {
    return (await this.listSlots(orgId)).filter((s) => s.position === code);
  }
}

class PostgresTeamNeedsRepository implements TeamNeedsRepository {
  async listPositionNeeds(orgId: string): Promise<PositionNeed[]> {
    const rows = await db.select().from(teamNeedsTbl).where(eq(teamNeedsTbl.orgId, orgId));
    return rows.map((r) => PositionNeedSchema.parse(clean(r)));
  }
  async upsertPositionNeed(orgId: string, need: PositionNeed): Promise<PositionNeed> {
    await db
      .insert(teamNeedsTbl)
      .values(need as typeof teamNeedsTbl.$inferInsert)
      .onConflictDoUpdate({ target: teamNeedsTbl.id, set: { ...need, id: undefined } });
    return need;
  }
  async getDepthChart(orgId: string): Promise<DepthChart> {
    const slotRows = await db.select().from(rosterSlotsTbl).where(eq(rosterSlotsTbl.orgId, orgId));
    const slots = slotRows.map((r) => RosterSlotSchema.parse(clean(r)));
    const needs = await this.listPositionNeeds(orgId);
    const snap = await db.select().from(rosterSnapshotsTbl).where(eq(rosterSnapshotsTbl.orgId, orgId)).limit(1);

    const needByPos = new Map(needs.map((n) => [n.position, n]));
    const byPos = new Map<PositionCode, RosterSlot[]>();
    for (const s of slots) {
      if (!byPos.has(s.position)) byPos.set(s.position, []);
      byPos.get(s.position)!.push(s);
    }
    const positions = [...byPos.entries()]
      .map(([position, ps]) => ({
        position,
        group: ps[0].positionGroup,
        idealDepth: needByPos.get(position)?.idealDepth ?? ps.length,
        slots: ps.sort((a, b) => a.depthRank - b.depthRank),
      }))
      .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));

    return {
      orgId,
      seasonYear: snap[0]?.seasonYear ?? new Date().getFullYear(),
      asOf: snap[0]?.asOf ?? new Date().toISOString(),
      positions,
    };
  }
}

class PostgresBoardRepository implements RecruitingBoardRepository {
  async listBoards(orgId: string): Promise<Board[]> {
    const rows = await db.select().from(boardsTbl).where(eq(boardsTbl.orgId, orgId));
    return rows.map((r) => BoardSchema.parse(clean(r)));
  }
  async getBoard(boardId: string): Promise<Board | null> {
    const rows = await db.select().from(boardsTbl).where(eq(boardsTbl.id, boardId)).limit(1);
    return rows[0] ? BoardSchema.parse(clean(rows[0])) : null;
  }
  async getDefaultBoard(orgId: string): Promise<Board | null> {
    const rows = await db
      .select()
      .from(boardsTbl)
      .where(and(eq(boardsTbl.orgId, orgId), eq(boardsTbl.isDefault, true)))
      .limit(1);
    return rows[0] ? BoardSchema.parse(clean(rows[0])) : null;
  }
  async listStages(boardId: string): Promise<RecruitingStage[]> {
    const rows = await db.select().from(stagesTbl).where(eq(stagesTbl.boardId, boardId));
    return rows.map((r) => RecruitingStageSchema.parse(clean(r))).sort((a, b) => a.order - b.order);
  }
  async listEntries(boardId: string): Promise<BoardEntry[]> {
    const rows = await db.select().from(boardEntriesTbl).where(eq(boardEntriesTbl.boardId, boardId));
    return rows.map((r) => BoardEntrySchema.parse(clean(r)));
  }
  async addEntry(boardId: string, input: Omit<BoardEntry, "id">): Promise<BoardEntry> {
    const entry = BoardEntrySchema.parse({ ...input, id: `be_${input.playerId}`, boardId });
    await db
      .insert(boardEntriesTbl)
      .values(entry as typeof boardEntriesTbl.$inferInsert)
      .onConflictDoUpdate({ target: boardEntriesTbl.id, set: { ...entry, id: undefined } });
    return entry;
  }
  async updateEntry(entryId: string, patch: Partial<BoardEntry>): Promise<BoardEntry> {
    await db.update(boardEntriesTbl).set(patch).where(eq(boardEntriesTbl.id, entryId));
    const rows = await db.select().from(boardEntriesTbl).where(eq(boardEntriesTbl.id, entryId)).limit(1);
    if (!rows[0]) throw new Error(`Board entry ${entryId} not found`);
    return BoardEntrySchema.parse(clean(rows[0]));
  }
  async moveEntryStage(entryId: string, stage: BoardStage, rank: number): Promise<BoardEntry> {
    const rows = await db.select().from(boardEntriesTbl).where(eq(boardEntriesTbl.id, entryId)).limit(1);
    if (!rows[0]) throw new Error(`Board entry ${entryId} not found`);
    const entry = BoardEntrySchema.parse(clean(rows[0]));
    const now = new Date().toISOString();
    const stageId = `stage_${stage.toLowerCase()}`;
    const updated = {
      ...entry,
      stageId,
      canonicalStage: stage,
      rank,
      stageChangedAt: now,
      stageHistory: [...entry.stageHistory, { stageId, canonicalStage: stage, at: now }],
      updatedAt: now,
    };
    await db
      .update(boardEntriesTbl)
      .set({ stageId, canonicalStage: stage, rank, stageChangedAt: now, stageHistory: updated.stageHistory, updatedAt: now })
      .where(eq(boardEntriesTbl.id, entryId));
    return updated;
  }
  async removeEntry(entryId: string): Promise<void> {
    await db.delete(boardEntriesTbl).where(eq(boardEntriesTbl.id, entryId));
  }
}

class PostgresWatchlistRepository implements WatchlistRepository {
  async listForOrg(orgId: string): Promise<Watchlist[]> {
    const rows = await db.select().from(watchlistsTbl).where(eq(watchlistsTbl.orgId, orgId));
    return rows.map((r) => WatchlistSchema.parse(clean(r)));
  }
  async listForUser(userId: string): Promise<Watchlist[]> {
    const rows = await db.select().from(watchlistsTbl);
    return rows.map((r) => WatchlistSchema.parse(clean(r))).filter((w) => w.ownerId === userId || w.isShared);
  }
  async get(id: string): Promise<Watchlist | null> {
    const rows = await db.select().from(watchlistsTbl).where(eq(watchlistsTbl.id, id)).limit(1);
    return rows[0] ? WatchlistSchema.parse(clean(rows[0])) : null;
  }
  async toggle(watchlistId: string, playerId: string): Promise<Watchlist> {
    const w = await this.get(watchlistId);
    if (!w) throw new Error(`Watchlist ${watchlistId} not found`);
    const playerIds = w.playerIds.includes(playerId)
      ? w.playerIds.filter((p) => p !== playerId)
      : [...w.playerIds, playerId];
    await db
      .update(watchlistsTbl)
      .set({ playerIds, playerCount: playerIds.length, updatedAt: new Date().toISOString() })
      .where(eq(watchlistsTbl.id, watchlistId));
    return { ...w, playerIds, playerCount: playerIds.length };
  }
}

export function createPostgresRepositories(): Repositories {
  return {
    // data plane — real ingested + AI-evaluated tables in Neon
    players: new PostgresPlayerRepository(),
    schools: new PostgresSchoolRepository(),
    evaluations: new PostgresEvaluationRepository(),
    scoutingReports: new PostgresScoutingReportRepository(),
    aiInsights: new PostgresAIInsightRepository(),
    roster: new PostgresRosterRepository(),
    teamNeeds: new PostgresTeamNeedsRepository(),
    board: new PostgresBoardRepository(),
    watchlists: new PostgresWatchlistRepository(),
    // still mock — Maryland's staff/org (no ingested source; fine single-tenant)
    users: new MockUserRepository(),
    orgs: new MockOrganizationRepository(),
    // persisted to Neon → staff status changes, notes, and activity survive
    // restarts. Workflows are created lazily for real players by the service.
    workflows: new PostgresRecruitingWorkflowRepository(),
  };
}
