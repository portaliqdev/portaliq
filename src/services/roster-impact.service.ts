import type { TeamNeedsRepository, OrganizationRepository } from "@/repositories";
import type { Player } from "@/types/player";
import type { PositionCode } from "@/types/enums";
import {
  slotContributionGrade,
  computeRosterImpact,
  resolveNeedScore,
  type RosterImpact,
} from "@/lib/scoring";

export type { RosterImpact, ProjectedRole } from "@/lib/scoring";

/**
 * Roster Impact — quantifies how adding a portal player changes the strength of
 * his position room (current → projected room score, net, projected role). The
 * scoring math is pure (src/lib/scoring); this service just gathers the inputs:
 * the org's depth chart, positional needs, and scheme config.
 */
export class RosterImpactService {
  constructor(
    private needs: TeamNeedsRepository,
    private orgs: OrganizationRepository,
  ) {}

  /**
   * Impact of adding each player to its room. Batched — loads the depth chart,
   * needs, and org once. Players at positions with no roster room are skipped.
   */
  async forPlayers(orgId: string, players: Player[]): Promise<Map<string, RosterImpact>> {
    if (players.length === 0) return new Map();
    const [depth, needs, org] = await Promise.all([
      this.needs.getDepthChart(orgId),
      this.needs.listPositionNeeds(orgId),
      this.orgs.getCurrent(),
    ]);

    const gradesByPos = new Map<PositionCode, number[]>();
    for (const pos of depth.positions) {
      gradesByPos.set(pos.position, pos.slots.map((s) => slotContributionGrade(s)));
    }
    const needByPos = new Map(needs.map((n) => [n.position, n.needScore]));

    const out = new Map<string, RosterImpact>();
    for (const player of players) {
      const roomGrades = gradesByPos.get(player.primaryPosition);
      if (!roomGrades) continue; // no roster room tracked for this position
      const needScore = resolveNeedScore(needByPos, player.primaryPosition);
      out.set(
        player.id,
        computeRosterImpact({ player, org, roomGrades, position: player.primaryPosition, needScore }),
      );
    }
    return out;
  }

  async forPlayer(orgId: string, player: Player): Promise<RosterImpact | null> {
    return (await this.forPlayers(orgId, [player])).get(player.id) ?? null;
  }
}
