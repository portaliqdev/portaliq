import type { BoardEntry } from "@/types/board";
import type { Player } from "@/types/player";
import type {
  OfferStatus,
  RecruitingActivity,
  RecruitingPriority,
  RecruitingStatus,
  RecruitingWorkflow,
  RiskLevel,
  StaffOwner,
  VisitStatus,
} from "@/types/recruiting-workflow";
import type { User } from "@/types/user";

const ORG_ID = "org_maryland";
const BASE_TIME = Date.parse("2026-06-10T12:00:00.000Z");

const STATUS_SEQUENCE: RecruitingStatus[] = [
  "UNREVIEWED",
  "EVALUATED",
  "WATCHLIST",
  "CONTACTED",
  "OFFER_EXTENDED",
  "VISIT_SCHEDULED",
  "COMMITTED_ELSEWHERE",
  "COMMITTED_TO_US",
  "REMOVED_NOT_PURSUING",
];

const PRIORITY_SEQUENCE: RecruitingPriority[] = [
  "MEDIUM",
  "HIGH",
  "HIGH",
  "CRITICAL",
  "CRITICAL",
  "HIGH",
  "HIGH",
  "MEDIUM",
  "LOW",
];

function iso(hoursFromBase: number): string {
  return new Date(BASE_TIME + hoursFromBase * 60 * 60 * 1000).toISOString();
}

function ownerStamp(user: User | undefined): StaffOwner | undefined {
  if (!user) return undefined;
  return {
    id: user.id,
    name: user.displayName,
    role: user.role,
    initials: user.displayName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase(),
    photoUrl: user.photoUrl,
  };
}

function offerStatusFor(status: RecruitingStatus): OfferStatus {
  if (status === "COMMITTED_TO_US") return "ACCEPTED";
  if (status === "OFFER_EXTENDED") return "EXTENDED";
  if (status === "VISIT_SCHEDULED") return "UNDER_REVIEW";
  if (status === "COMMITTED_ELSEWHERE") return "DECLINED";
  return "NOT_EXTENDED";
}

function visitStatusFor(status: RecruitingStatus): VisitStatus {
  if (status === "COMMITTED_TO_US") return "COMPLETED";
  if (["VISIT_SCHEDULED", "OFFER_EXTENDED"].includes(status)) return "SCHEDULED";
  if (["COMMITTED_ELSEWHERE", "REMOVED_NOT_PURSUING"].includes(status)) return "CANCELED";
  return "NOT_SCHEDULED";
}

function riskFor(status: RecruitingStatus, index: number): RiskLevel {
  if (status === "COMMITTED_TO_US") return "NONE";
  if (status === "COMMITTED_ELSEWHERE") return "HIGH";
  return (["LOW", "MEDIUM", "HIGH"] as RiskLevel[])[index % 3];
}

function activityFor(
  workflowId: string,
  status: RecruitingStatus,
  owner: StaffOwner | undefined,
  index: number,
): RecruitingActivity {
  return {
    id: `rwa_${String(index + 1).padStart(3, "0")}_status`,
    workflowId,
    type: "STATUS_CHANGE",
    title: `Moved to ${status.replaceAll("_", " ").toLowerCase()}`,
    detail: "Deterministic mock workflow seed activity.",
    createdBy: owner,
    createdAt: iso(-index * 5),
    metadata: { toStatus: status },
  };
}

/**
 * Builds stable workflow fixtures from the generated player database. The
 * supplied players, board entries, and users are deterministic, so IDs and
 * field values remain stable between runs.
 */
export function createMockRecruitingWorkflowSeed(
  players: Player[],
  users: User[],
  boardEntries: BoardEntry[],
): RecruitingWorkflow[] {
  const boardEntryByPlayer = new Map(
    boardEntries.map((entry) => [entry.playerId, entry]),
  );
  const userById = new Map(users.map((user) => [user.id, user]));
  const fallbackOwners = users.filter((user) => user.isActive);

  const candidates = [...players]
    .filter((player) => boardEntryByPlayer.has(player.id))
    .sort(
      (a, b) =>
        (b.fitScore ?? 0) - (a.fitScore ?? 0) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 27);

  return candidates.map((player, index) => {
    const status = STATUS_SEQUENCE[index % STATUS_SEQUENCE.length];
    const entry = boardEntryByPlayer.get(player.id);
    const ownerUser =
      userById.get(entry?.assignedToId ?? "") ??
      fallbackOwners[index % fallbackOwners.length];
    const owner = ownerStamp(ownerUser);
    const id = `rw_${player.id}`;
    const createdAt = iso(-240 - index * 3);
    const updatedAt = iso(-index * 2);
    const hasVisit = ["VISIT_SCHEDULED", "OFFER_EXTENDED", "COMMITTED_TO_US"].includes(status);
    const hasOffer = ["OFFER_EXTENDED", "COMMITTED_TO_US"].includes(status);
    const hasCommitment = ["COMMITTED_ELSEWHERE", "COMMITTED_TO_US"].includes(status);

    return {
      id,
      orgId: player.orgId || ORG_ID,
      playerId: player.id,
      playerName: player.fullName,
      position: player.primaryPosition,
      currentSchoolName: player.currentSchool.name,
      status,
      priority: PRIORITY_SEQUENCE[index % PRIORITY_SEQUENCE.length],
      offerStatus: offerStatusFor(status),
      visitStatus: visitStatusFor(status),
      riskLevel: riskFor(status, index),
      priorityScore: Math.max(0, 92 - index * 2),
      owner,
      nextAction:
        status === "REMOVED_NOT_PURSUING" || status === "COMMITTED_ELSEWHERE"
          ? undefined
          : `Complete ${status.replaceAll("_", " ").toLowerCase()} follow-up`,
      nextActionAt:
        status === "REMOVED_NOT_PURSUING" || status === "COMMITTED_ELSEWHERE"
          ? undefined
          : iso(24 + index * 4),
      lastContactAt:
        status === "UNREVIEWED" || status === "EVALUATED" || status === "WATCHLIST"
          ? undefined
          : iso(-12 - index * 2),
      visitAt: hasVisit ? iso(72 + index * 6) : undefined,
      offerExtendedAt: hasOffer ? iso(-48 - index) : undefined,
      committedAt: hasCommitment ? iso(-36 - index) : undefined,
      signedAt: undefined,
      enrolledAt: undefined,
      activities: [activityFor(id, status, owner, index)],
      createdAt,
      updatedAt,
    };
  });
}
