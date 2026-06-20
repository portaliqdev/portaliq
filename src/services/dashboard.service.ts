import type {
  PlayerRepository,
  RecruitingBoardRepository,
  TeamNeedsRepository,
  AIInsightRepository,
  EvaluationRepository,
  OrganizationRepository,
} from "@/repositories";
import type { Player } from "@/types/player";
import type { PositionNeed } from "@/types/team-needs";
import type { AIInsight } from "@/types/ai";
import type { Evaluation } from "@/types/evaluation";
import type { Organization } from "@/types/user";

export interface DashboardKpis {
  portalTotal: number;
  inPortal: number;
  boardSize: number;
  criticalNeeds: number;
  avgBoardFit: number;
  undervalued: number;
}
export interface DashboardAlert {
  id: string;
  tone: "danger" | "risk" | "info" | "target";
  title: string;
  detail: string;
}
export interface RecentEval {
  evaluation: Evaluation;
  playerName: string;
  position: string;
  fitScore?: number;
}
export interface DashboardData {
  org: Organization;
  kpis: DashboardKpis;
  newPortalPlayers: Player[];
  priorityRecruits: Player[];
  topNeeds: PositionNeed[];
  alerts: DashboardAlert[];
  aiRecommendations: AIInsight[];
  recentEvaluations: RecentEval[];
}

export class DashboardService {
  constructor(
    private players: PlayerRepository,
    private board: RecruitingBoardRepository,
    private teamNeeds: TeamNeedsRepository,
    private aiInsights: AIInsightRepository,
    private evaluations: EvaluationRepository,
    private orgs: OrganizationRepository,
  ) {}

  async getDashboard(orgId: string): Promise<DashboardData> {
    const org = await this.orgs.getCurrent();
    const [players, needs, defaultBoard, insights, evals] = await Promise.all([
      this.players.list(),
      this.teamNeeds.listPositionNeeds(orgId),
      this.board.getDefaultBoard(orgId),
      this.aiInsights.list(),
      this.evaluations.list(),
    ]);
    const entries = defaultBoard ? await this.board.listEntries(defaultBoard.id) : [];
    const playerById = new Map(players.map((p) => [p.id, p]));

    const inPortal = players.filter((p) => p.portalStatus === "IN_PORTAL");
    const newPortalPlayers = [...inPortal]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);

    const priorityEntries = entries
      .filter((e) => ["OFFER_EXTENDED", "PRIORITY", "CONTACTED"].includes(e.canonicalStage))
      .sort((a, b) => (b.playerStamp.fitScore ?? 0) - (a.playerStamp.fitScore ?? 0));
    const priorityRecruits = priorityEntries
      .map((e) => playerById.get(e.playerId))
      .filter((p): p is Player => Boolean(p))
      .slice(0, 6);

    const topNeeds = [...needs].sort((a, b) => b.needScore - a.needScore).slice(0, 6);

    const boardFits = entries.map((e) => e.playerStamp.fitScore ?? 0).filter((n) => n > 0);
    const avgBoardFit = boardFits.length
      ? Math.round(boardFits.reduce((s, n) => s + n, 0) / boardFits.length)
      : 0;

    const kpis: DashboardKpis = {
      portalTotal: players.length,
      inPortal: inPortal.length,
      boardSize: entries.length,
      criticalNeeds: needs.filter((n) => n.priority === "CRITICAL").length,
      avgBoardFit,
      undervalued: players.filter((p) => (p.undervaluation ?? 0) >= 20).length,
    };

    const aiRecommendations = [...insights]
      .sort((a, b) => (a.type === "FIT_ANALYSIS" ? -1 : 1))
      .slice(0, 5);

    const recentEvaluations: RecentEval[] = [...evals]
      .slice(-8)
      .reverse()
      .slice(0, 6)
      .map((e) => {
        const p = playerById.get(e.playerId);
        return {
          evaluation: e,
          playerName: p?.fullName ?? "Unknown",
          position: p?.primaryPosition ?? "—",
          fitScore: p?.fitScore,
        };
      });

    const alerts: DashboardAlert[] = [];
    for (const n of topNeeds.filter((x) => x.priority === "CRITICAL").slice(0, 2)) {
      alerts.push({
        id: `alert_need_${n.position}`,
        tone: "danger",
        title: `Critical need at ${n.position}`,
        detail: n.notes ?? `Only ${n.projectedReturning} projected to return vs. ${n.idealDepth} ideal.`,
      });
    }
    const offers = entries.filter((e) => e.canonicalStage === "OFFER_EXTENDED").length;
    if (offers > 0) {
      alerts.push({
        id: "alert_offers",
        tone: "target",
        title: `${offers} offers extended`,
        detail: "Awaiting decisions — keep contact cadence tight before visits close.",
      });
    }
    const topUnder = [...players].sort((a, b) => (b.undervaluation ?? 0) - (a.undervaluation ?? 0))[0];
    if (topUnder && (topUnder.undervaluation ?? 0) >= 20) {
      alerts.push({
        id: "alert_under",
        tone: "info",
        title: `Moneyball flag: ${topUnder.fullName}`,
        detail: `${topUnder.primaryPosition} producing well above a ${topUnder.stars}★ pedigree (+${topUnder.undervaluation ?? 0}).`,
      });
    }
    const windowClosing = inPortal.filter((p) => p.tags.includes("in-window")).length;
    if (windowClosing > 0) {
      alerts.push({
        id: "alert_window",
        tone: "risk",
        title: `${windowClosing} in the active window`,
        detail: "Players in the current portal window — evaluate before they commit elsewhere.",
      });
    }

    return {
      org,
      kpis,
      newPortalPlayers,
      priorityRecruits,
      topNeeds,
      alerts,
      aiRecommendations,
      recentEvaluations,
    };
  }
}
