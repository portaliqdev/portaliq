/**
 * Repository INTERFACES — the data-access contract (system-architecture.md §3).
 * Pure data access only. No business logic, no scoring, no Firebase. The mock
 * adapters (Phase 1) and the future Firestore adapters (Phase 2) both implement
 * these exact shapes; nothing upstream of di.ts knows which is live.
 */
import type {
  Player,
  PlayerFilters,
  PortalStatus,
} from "@/types/player";
import type {
  PlayerStats,
  PlayerMeasurements,
  FilmLink,
  TransferEntry,
} from "@/types/stats";
import type { StatusEvent } from "@/types/availability";
import type { School, Conference } from "@/types/school";
import type { Evaluation } from "@/types/evaluation";
import type { ScoutingReport } from "@/types/scouting-report";
import type {
  Board,
  RecruitingStage,
  BoardEntry,
  BoardStage,
  Watchlist,
} from "@/types/board";
import type { PositionNeed, DepthChart, RosterSlot, RosterSnapshot } from "@/types/team-needs";
import type { AIInsight, AIInsightKind } from "@/types/ai";
import type { User, StaffRole, Organization } from "@/types/user";
import type { PositionCode } from "@/types/enums";
import type { RecruitingWorkflowRepository } from "./recruiting-workflow.repository";

export interface ReadRepository<T, ID = string> {
  list(): Promise<T[]>;
  get(id: ID): Promise<T | null>;
}
export interface WriteRepository<T, ID = string> {
  create(input: Omit<T, "id">): Promise<T>;
  update(id: ID, patch: Partial<Omit<T, "id">>): Promise<T>;
  delete(id: ID): Promise<void>;
}
export interface CrudRepository<T, ID = string>
  extends ReadRepository<T, ID>,
    WriteRepository<T, ID> {}

/**
 * Atomic availability write. The caller (server action / ingest) computes the
 * reconciled result through the availability service, then hands the adapter the
 * full player patch plus an optional audit event and effective status to sync
 * onto the active transfer entry — all persisted in ONE transaction so the
 * player, its transfer record, and the audit log can never drift apart.
 */
export interface CommitAvailabilityInput {
  patch: Partial<Omit<Player, "id">>;
  /** Effective status to mirror onto the active transfer entry (+ its history). */
  effectiveStatus?: PortalStatus;
  /** Append an audit row only when the change is material (keeps reruns clean). */
  event?: Omit<StatusEvent, "id" | "playerId" | "orgId" | "createdAt">;
}

export interface PlayerRepository extends CrudRepository<Player> {
  queryPlayers(filters: PlayerFilters): Promise<Player[]>;
  listByPosition(positionCode: PositionCode): Promise<Player[]>;
  listByPortalStatus(status: PortalStatus): Promise<Player[]>;
  getMany(ids: string[]): Promise<Player[]>;
  // owned subresources (Firestore subcollections in Phase 2)
  listStats(playerId: string): Promise<PlayerStats[]>;
  listMeasurements(playerId: string): Promise<PlayerMeasurements[]>;
  listFilm(playerId: string): Promise<FilmLink[]>;
  listTransferEntries(playerId: string): Promise<TransferEntry[]>;
  // availability audit
  commitAvailability(playerId: string, input: CommitAvailabilityInput): Promise<Player>;
  listStatusEvents(playerId: string): Promise<StatusEvent[]>;
}

export interface SchoolRepository extends ReadRepository<School> {
  listByConference(conference: Conference): Promise<School[]>;
  getMany(ids: string[]): Promise<School[]>;
}

export interface EvaluationRepository extends CrudRepository<Evaluation> {
  listByPlayer(playerId: string): Promise<Evaluation[]>;
  listByEvaluator(evaluatorId: string): Promise<Evaluation[]>;
}

export interface ScoutingReportRepository extends CrudRepository<ScoutingReport> {
  listByPlayer(playerId: string): Promise<ScoutingReport[]>;
  getLatestForPlayer(playerId: string): Promise<ScoutingReport | null>;
}

export interface RecruitingBoardRepository {
  listBoards(orgId: string): Promise<Board[]>;
  getBoard(boardId: string): Promise<Board | null>;
  getDefaultBoard(orgId: string): Promise<Board | null>;
  listStages(boardId: string): Promise<RecruitingStage[]>;
  listEntries(boardId: string): Promise<BoardEntry[]>;
  addEntry(boardId: string, input: Omit<BoardEntry, "id">): Promise<BoardEntry>;
  updateEntry(entryId: string, patch: Partial<BoardEntry>): Promise<BoardEntry>;
  moveEntryStage(entryId: string, stage: BoardStage, rank: number): Promise<BoardEntry>;
  removeEntry(entryId: string): Promise<void>;
}

export interface TeamNeedsRepository {
  listPositionNeeds(orgId: string): Promise<PositionNeed[]>;
  upsertPositionNeed(orgId: string, need: PositionNeed): Promise<PositionNeed>;
  getDepthChart(orgId: string): Promise<DepthChart>;
}

export interface RosterRepository {
  getSnapshot(orgId: string): Promise<RosterSnapshot | null>;
  listSlots(orgId: string): Promise<RosterSlot[]>;
  listByPosition(orgId: string, positionCode: PositionCode): Promise<RosterSlot[]>;
}

export interface WatchlistRepository {
  listForOrg(orgId: string): Promise<Watchlist[]>;
  listForUser(userId: string): Promise<Watchlist[]>;
  get(id: string): Promise<Watchlist | null>;
  toggle(watchlistId: string, playerId: string): Promise<Watchlist>;
}

export interface AIInsightRepository extends CrudRepository<AIInsight> {
  listByPlayer(playerId: string): Promise<AIInsight[]>;
  getLatestForPlayer(playerId: string): Promise<AIInsight | null>;
  listByKind(kind: AIInsightKind): Promise<AIInsight[]>;
}

export interface UserRepository extends CrudRepository<User> {
  getByEmail(email: string): Promise<User | null>;
  listByOrg(orgId: string): Promise<User[]>;
  listByRole(orgId: string, role: StaffRole): Promise<User[]>;
  getCurrentUser(): Promise<User>;
}

export interface OrganizationRepository extends ReadRepository<Organization> {
  getByOrgId(orgId: string): Promise<Organization | null>;
  getCurrent(): Promise<Organization>;
}

/** The full set of repositories the DI container provides. */
export interface Repositories {
  players: PlayerRepository;
  schools: SchoolRepository;
  evaluations: EvaluationRepository;
  scoutingReports: ScoutingReportRepository;
  board: RecruitingBoardRepository;
  teamNeeds: TeamNeedsRepository;
  roster: RosterRepository;
  watchlists: WatchlistRepository;
  aiInsights: AIInsightRepository;
  users: UserRepository;
  orgs: OrganizationRepository;
  workflows: RecruitingWorkflowRepository;
}

export type { RecruitingWorkflowRepository } from "./recruiting-workflow.repository";
