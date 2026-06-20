import type {
  PlayerRepository,
  SchoolRepository,
  AIInsightRepository,
  EvaluationRepository,
  ScoutingReportRepository,
} from "@/repositories";
import type { Player, PlayerFilters } from "@/types/player";
import type { PlayerStats, PlayerMeasurements, FilmLink, TransferEntry } from "@/types/stats";
import type { School } from "@/types/school";
import type { Evaluation } from "@/types/evaluation";
import type { ScoutingReport } from "@/types/scouting-report";
import type { AIInsight } from "@/types/ai";
import type { Conference, PositionGroup, PortalStatus } from "@/types/enums";
import { findSimilar } from "@/lib/scoring";
import type { FitScoreService, FitBreakdown } from "./fit-score.service";

export interface FacetCount<T extends string> {
  value: T;
  count: number;
}
export interface PortalFacets {
  total: number;
  positionGroups: FacetCount<PositionGroup>[];
  conferences: FacetCount<Conference>[];
  portalStatuses: FacetCount<PortalStatus>[];
  yearsRemaining: { years: number; count: number }[];
}

export interface PlayerDetail {
  player: Player;
  stats: PlayerStats[];
  measurements: PlayerMeasurements[];
  film: FilmLink[];
  transfers: TransferEntry[];
  previousSchools: School[];
  similar: Player[];
  aiInsight: AIInsight | null;
  evaluations: Evaluation[];
  scoutingReport: ScoutingReport | null;
  fit: FitBreakdown | null;
}

export class SearchService {
  constructor(
    private players: PlayerRepository,
    private schools: SchoolRepository,
    private aiInsights: AIInsightRepository,
    private evaluations: EvaluationRepository,
    private scoutingReports: ScoutingReportRepository,
    private fit: FitScoreService,
  ) {}

  searchPortal(filters: PlayerFilters): Promise<Player[]> {
    return this.players.queryPlayers(filters);
  }

  compare(ids: string[]): Promise<Player[]> {
    return this.players.getMany(ids);
  }

  async similar(playerId: string, n = 6): Promise<Player[]> {
    const target = await this.players.get(playerId);
    if (!target) return [];
    const all = await this.players.list();
    return findSimilar(target, all, n);
  }

  async facets(): Promise<PortalFacets> {
    const all = await this.players.list();
    const countBy = <T extends string>(get: (p: Player) => T | undefined) => {
      const m = new Map<T, number>();
      for (const p of all) {
        const v = get(p);
        if (v == null) continue;
        m.set(v, (m.get(v) ?? 0) + 1);
      }
      return [...m.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    };
    const years = [0, 1, 2, 3, 4].map((y) => ({
      years: y,
      count: all.filter((p) => p.eligibility.yearsRemaining === y).length,
    }));
    return {
      total: all.length,
      positionGroups: countBy((p) => p.positionGroup),
      conferences: countBy((p) => p.currentSchool.conference as Conference),
      portalStatuses: countBy((p) => p.portalStatus),
      yearsRemaining: years,
    };
  }

  async getPlayerDetail(id: string): Promise<PlayerDetail | null> {
    const player = await this.players.get(id);
    if (!player) return null;
    const [stats, measurements, film, transfers, previousSchools, similar, aiInsight, evaluations, scoutingReport, fit] =
      await Promise.all([
        this.players.listStats(id),
        this.players.listMeasurements(id),
        this.players.listFilm(id),
        this.players.listTransferEntries(id),
        this.schools.getMany(player.previousSchoolIds),
        this.similar(id, 6),
        this.aiInsights.getLatestForPlayer(id),
        this.evaluations.listByPlayer(id),
        this.scoutingReports.getLatestForPlayer(id),
        this.fit.breakdown(id),
      ]);
    return {
      player,
      stats,
      measurements,
      film,
      transfers,
      previousSchools,
      similar,
      aiInsight,
      evaluations,
      scoutingReport,
      fit,
    };
  }
}
