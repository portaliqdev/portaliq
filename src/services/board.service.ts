import type { RecruitingBoardRepository, UserRepository, PlayerRepository } from "@/repositories";
import type { Board, BoardEntry, BoardStage, PlayerStamp } from "@/types/board";
import { assertCanTransition, canMoveToStage } from "./permissions";

export interface BoardColumn {
  stage: BoardStage;
  stageId: string;
  label: string;
  entries: BoardEntry[];
  count: number;
}
export interface BoardView {
  board: Board;
  columns: BoardColumn[];
}

/** Business logic for the recruiting board: assembly + role-gated stage moves. */
export class BoardService {
  constructor(
    private board: RecruitingBoardRepository,
    private users: UserRepository,
    private players: PlayerRepository,
  ) {}

  async getBoardView(orgId: string): Promise<BoardView | null> {
    const board = await this.board.getDefaultBoard(orgId);
    if (!board) return null;
    const [stages, rawEntries] = await Promise.all([
      this.board.listStages(board.id),
      this.board.listEntries(board.id),
    ]);
    // Refresh each stamp's effective portal status from the live player so the
    // board flags anyone who has since left the portal (the stamp captured at
    // add-time would otherwise go stale).
    const players = await this.players.getMany(rawEntries.map((e) => e.playerId));
    const statusById = new Map(players.map((p) => [p.id, p.portalStatus]));
    const entries = rawEntries.map((e) =>
      statusById.has(e.playerId)
        ? { ...e, playerStamp: { ...e.playerStamp, portalStatus: statusById.get(e.playerId) } }
        : e,
    );
    const columns: BoardColumn[] = stages.map((s) => {
      const colEntries = entries
        .filter((e) => e.canonicalStage === s.canonicalStage)
        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
      return { stage: s.canonicalStage, stageId: s.id, label: s.label, entries: colEntries, count: colEntries.length };
    });
    return { board, columns };
  }

  /** Whether the current demo user may move a card into `stage`. */
  async canMove(stage: BoardStage): Promise<boolean> {
    const actor = await this.users.getCurrentUser();
    return canMoveToStage(actor.role, stage);
  }

  async moveStage(entryId: string, stage: BoardStage, rank: number): Promise<BoardEntry> {
    const actor = await this.users.getCurrentUser();
    assertCanTransition(actor.role, stage);
    return this.board.moveEntryStage(entryId, stage, rank);
  }

  /** Add a player from the portal onto the default board in WATCHING. */
  async addPlayer(orgId: string, playerId: string, stage: BoardStage = "NEEDS_REVIEW"): Promise<BoardEntry | null> {
    const board = await this.board.getDefaultBoard(orgId);
    const player = await this.players.get(playerId);
    if (!board || !player) return null;
    const existing = (await this.board.listEntries(board.id)).find((e) => e.playerId === playerId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const stamp: PlayerStamp = {
      fullName: player.fullName,
      primaryPosition: player.primaryPosition,
      currentSchoolName: player.currentSchool.name,
      currentSchoolConference: player.currentSchool.conference,
      stars: player.stars,
      yearsRemaining: player.eligibility.yearsRemaining,
      fitScore: player.fitScore,
      heightInches: player.heightInches,
      weightLbs: player.weightLbs,
      portalStatus: player.portalStatus,
    };
    return this.board.addEntry(board.id, {
      orgId,
      boardId: board.id,
      stageId: `stage_${stage.toLowerCase()}`,
      canonicalStage: stage,
      playerId,
      playerStamp: stamp,
      positionColumn: player.primaryPosition,
      flags: [],
      stageHistory: [{ stageId: `stage_${stage.toLowerCase()}`, canonicalStage: stage, at: now }],
      stageChangedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}
