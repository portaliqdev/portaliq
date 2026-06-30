import type { PlayerRepository } from "@/repositories";
import type { Player } from "@/types/player";
import type { PositionGroup, Conference } from "@/types/enums";
import { POSITION_GROUPS } from "@/types/enums";

export interface PositionRanking {
  group: PositionGroup;
  players: Player[];
}
export interface ConferenceRow {
  conference: Conference;
  count: number;
  avgFit: number;
  topPlayer: string;
}

export class ReportsService {
  constructor(private players: PlayerRepository) {}

  /**
   * The available-target pool. Reports rank players the staff can actually
   * pursue, so committed / withdrawn / enrolled players are excluded — only the
   * effective IN_PORTAL pool counts as an active portal target (issue #1).
   */
  private async available(): Promise<Player[]> {
    const all = await this.players.list();
    return all.filter((p) => p.portalStatus === "IN_PORTAL");
  }

  async bigBoard(limit = 50): Promise<Player[]> {
    const all = await this.available();
    return [...all].sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0)).slice(0, limit);
  }

  async byPositionGroup(perGroup = 8): Promise<PositionRanking[]> {
    const all = await this.available();
    return POSITION_GROUPS.map((group) => ({
      group,
      players: all
        .filter((p) => p.positionGroup === group)
        .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))
        .slice(0, perGroup),
    })).filter((r) => r.players.length > 0);
  }

  async undervalued(limit = 25): Promise<Player[]> {
    const all = await this.available();
    return [...all]
      .filter((p) => (p.undervaluation ?? 0) > 0)
      .sort((a, b) => (b.undervaluation ?? 0) - (a.undervaluation ?? 0))
      .slice(0, limit);
  }

  async conferenceBreakdown(): Promise<ConferenceRow[]> {
    const all = await this.available();
    const byConf = new Map<Conference, Player[]>();
    for (const p of all) {
      const c = p.currentSchool.conference as Conference;
      if (!byConf.has(c)) byConf.set(c, []);
      byConf.get(c)!.push(p);
    }
    return [...byConf.entries()]
      .map(([conference, players]) => {
        const sorted = [...players].sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));
        return {
          conference,
          count: players.length,
          avgFit: Math.round(players.reduce((s, p) => s + (p.fitScore ?? 0), 0) / players.length),
          topPlayer: sorted[0]?.fullName ?? "—",
        };
      })
      .sort((a, b) => b.count - a.count);
  }
}
