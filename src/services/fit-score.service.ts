import type {
  PlayerRepository,
  OrganizationRepository,
  TeamNeedsRepository,
} from "@/repositories";
import {
  computeFitScore,
  schemeFitScore,
  eligibilityValue,
  pedigreeScore,
  resolveNeedScore,
} from "@/lib/scoring";

export interface FitComponent {
  key: string;
  label: string;
  value: number; // 0-100
  weight: number; // 0-1
}
export interface FitBreakdown {
  total: number;
  components: FitComponent[];
}

/**
 * Orchestrates the deterministic fit-score model: pulls the player, the program
 * scheme config, and live position needs, then runs the pure scoring math.
 * The *formula* is a service concern; the inputs come from repositories.
 */
export class FitScoreService {
  constructor(
    private players: PlayerRepository,
    private orgs: OrganizationRepository,
    private teamNeeds: TeamNeedsRepository,
  ) {}

  async breakdown(playerId: string): Promise<FitBreakdown | null> {
    const p = await this.players.get(playerId);
    if (!p) return null;
    const org = await this.orgs.getCurrent();
    const needs = await this.teamNeeds.listPositionNeeds(org.id);
    const needByPos = new Map(needs.map((n) => [n.position, n.needScore]));
    const need = resolveNeedScore(needByPos, p.primaryPosition);
    const production = p.productionScore ?? 50;
    const scheme = schemeFitScore(p, org);
    const elig = eligibilityValue(p);
    const pedigree = pedigreeScore(p.compositeRating);
    const total = computeFitScore(p, org, { needScore: need, productionPercentile: production });

    return {
      total,
      components: [
        { key: "production", label: "Production percentile", value: Math.round(production), weight: 0.28 },
        { key: "scheme", label: "Scheme fit", value: Math.round(scheme), weight: 0.22 },
        { key: "need", label: "Position need", value: Math.round(need), weight: 0.18 },
        { key: "eligibility", label: "Eligibility value", value: Math.round(elig), weight: 0.16 },
        { key: "pedigree", label: "Recruiting pedigree", value: Math.round(pedigree), weight: 0.16 },
      ],
    };
  }
}
