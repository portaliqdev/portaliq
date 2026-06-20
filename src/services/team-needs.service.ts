import type {
  TeamNeedsRepository,
  RosterRepository,
  PlayerRepository,
} from "@/repositories";
import type { PositionNeed, DepthChart } from "@/types/team-needs";
import type { Player } from "@/types/player";

export interface NeedsSummary {
  critical: number;
  high: number;
  totalGaps: number;
  availableScholarships: number;
  scholarshipsUsed: number;
  scholarshipLimit: number;
}
export interface NeedsView {
  needs: PositionNeed[];
  depthChart: DepthChart;
  summary: NeedsSummary;
}
export interface NeedRecommendation {
  need: PositionNeed;
  targets: Player[];
}

export class TeamNeedsService {
  constructor(
    private needs: TeamNeedsRepository,
    private roster: RosterRepository,
    private players: PlayerRepository,
  ) {}

  async getNeedsView(orgId: string): Promise<NeedsView> {
    const [needs, depthChart, snapshot] = await Promise.all([
      this.needs.listPositionNeeds(orgId),
      this.needs.getDepthChart(orgId),
      this.roster.getSnapshot(orgId),
    ]);
    const sorted = [...needs].sort((a, b) => b.needScore - a.needScore);
    const summary: NeedsSummary = {
      critical: needs.filter((n) => n.priority === "CRITICAL").length,
      high: needs.filter((n) => n.priority === "HIGH").length,
      totalGaps: needs.reduce((s, n) => s + Math.max(0, n.idealDepth - n.projectedReturning), 0),
      availableScholarships: needs.reduce((s, n) => s + (n.availableScholarships ?? 0), 0),
      scholarshipsUsed: snapshot?.scholarshipCount ?? 0,
      scholarshipLimit: snapshot?.scholarshipLimit ?? 85,
    };
    return { needs: sorted, depthChart, summary };
  }

  async recommendations(orgId: string, perNeed = 3): Promise<NeedRecommendation[]> {
    const needs = (await this.needs.listPositionNeeds(orgId))
      .filter((n) => n.priority === "CRITICAL" || n.priority === "HIGH")
      .sort((a, b) => b.needScore - a.needScore)
      .slice(0, 6);
    const all = await this.players.list();
    return needs.map((need) => {
      const targets = all
        .filter((p) => p.primaryPosition === need.position && p.portalStatus === "IN_PORTAL")
        .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))
        .slice(0, perNeed);
      return { need, targets };
    });
  }
}
