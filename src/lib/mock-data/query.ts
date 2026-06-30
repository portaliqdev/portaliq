import type { Player, PlayerFilters, SortKey } from "@/types/player";
import { POSITION_META } from "@/types/enums";

function matchesQuery(p: Player, q: string): boolean {
  const t = q.toLowerCase();
  return (
    p.fullName.toLowerCase().includes(t) ||
    p.currentSchool.name.toLowerCase().includes(t) ||
    p.primaryPosition.toLowerCase() === t ||
    POSITION_META[p.primaryPosition].label.toLowerCase().includes(t) ||
    (p.hometown?.toLowerCase().includes(t) ?? false)
  );
}

const SORT_VALUE: Record<SortKey, (p: Player) => number | string> = {
  fitScore: (p) => p.fitScore ?? 0,
  compositeRating: (p) => p.compositeRating,
  yearsRemaining: (p) => p.eligibility.yearsRemaining,
  productionScore: (p) => p.productionScore ?? 0,
  undervaluation: (p) => p.undervaluation ?? 0,
  needScore: (p) => p.needScore ?? 0,
  lastName: (p) => p.lastName,
  enteredPortal: (p) => p.createdAt,
};

export function applyPlayerFilters(players: Player[], f: PlayerFilters): Player[] {
  let out = players;

  if (f.q && f.q.trim()) {
    const q = f.q.trim();
    out = out.filter((p) => matchesQuery(p, q));
  }
  if (f.positions?.length) out = out.filter((p) => f.positions!.includes(p.primaryPosition));
  if (f.positionGroups?.length) out = out.filter((p) => f.positionGroups!.includes(p.positionGroup));
  if (f.conferences?.length) out = out.filter((p) => f.conferences!.includes(p.currentSchool.conference));
  if (f.schoolIds?.length) out = out.filter((p) => f.schoolIds!.includes(p.currentSchoolId));
  // Status filtering on the EFFECTIVE portalStatus. An explicit `portalStatuses`
  // is an intentional filter (lets staff retrieve withdrawn/committed/enrolled
  // players); otherwise `availableOnly` restricts to the default available pool.
  if (f.portalStatuses?.length) {
    out = out.filter((p) => p.portalStatus && f.portalStatuses!.includes(p.portalStatus));
  } else if (f.availableOnly) {
    out = out.filter((p) => p.portalStatus === "IN_PORTAL");
  }
  if (f.eligibilityClasses?.length) out = out.filter((p) => f.eligibilityClasses!.includes(p.eligibilityClass));
  if (f.minYearsRemaining != null) out = out.filter((p) => p.eligibility.yearsRemaining >= f.minYearsRemaining!);
  if (f.maxYearsRemaining != null) out = out.filter((p) => p.eligibility.yearsRemaining <= f.maxYearsRemaining!);
  if (f.minHeightInches != null) out = out.filter((p) => p.heightInches >= f.minHeightInches!);
  if (f.maxHeightInches != null) out = out.filter((p) => p.heightInches <= f.maxHeightInches!);
  if (f.minWeightLbs != null) out = out.filter((p) => p.weightLbs >= f.minWeightLbs!);
  if (f.maxWeightLbs != null) out = out.filter((p) => p.weightLbs <= f.maxWeightLbs!);
  if (f.minStars != null) out = out.filter((p) => p.stars >= f.minStars!);
  if (f.minComposite != null) out = out.filter((p) => p.compositeRating >= f.minComposite!);
  if (f.minFitScore != null) out = out.filter((p) => (p.fitScore ?? 0) >= f.minFitScore!);
  if (f.powerOnly) out = out.filter((p) => ["Big Ten", "SEC", "ACC", "Big 12"].includes(p.currentSchool.conference));
  if (f.undervaluedOnly) out = out.filter((p) => (p.undervaluation ?? 0) >= 20);

  const sortBy = f.sortBy ?? "fitScore";
  const dir = f.sortDir ?? "desc";
  const getter = SORT_VALUE[sortBy];
  out = [...out].sort((a, b) => {
    const va = getter(a);
    const vb = getter(b);
    let cmp: number;
    if (typeof va === "string" || typeof vb === "string") {
      cmp = String(va).localeCompare(String(vb));
    } else {
      cmp = (va as number) - (vb as number);
    }
    return dir === "asc" ? cmp : -cmp;
  });

  if (f.limit != null) out = out.slice(0, f.limit);
  return out;
}
