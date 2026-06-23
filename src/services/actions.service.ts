import type {
  PlayerRepository,
  RecruitingBoardRepository,
  TeamNeedsRepository,
} from "@/repositories";
import type { RecruitingWorkflowService } from "./recruiting-workflow.service";
import { BOARD_STAGE_LABEL } from "@/types/board";
import type { BoardStage } from "@/types/enums";

export type ActionTone = "danger" | "risk" | "target" | "info";

export interface ActionItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export interface ActionGroup {
  id: string;
  tone: ActionTone;
  title: string;
  detail: string;
  count: number;
  cta: { label: string; href: string };
  items: ActionItem[];
}

const STUCK_DAYS = 14;
// A prospect is "actively pursued" once past evaluation.
const ACTIVE_STAGES: BoardStage[] = ["CONTACTED", "MUTUAL_INTEREST", "VISIT_SCHEDULED", "OFFER_EXTENDED", "COMMITTED"];
// Stages where sitting still is a problem (exclude Needs Review — that's its own
// action — and the terminal Committed / Lost).
const STUCK_STAGES: BoardStage[] = ["EVALUATING", "CONTACTED", "MUTUAL_INTEREST", "VISIT_SCHEDULED", "OFFER_EXTENDED"];

/**
 * Builds the dashboard "Today's Portal Actions" queue: the decisions that need
 * attention right now, each linking straight to the relevant player, board, or
 * position page. Pure aggregation over the same repositories the dashboard uses,
 * plus recruiting workflows for follow-up timing.
 */
export class ActionsService {
  constructor(
    private players: PlayerRepository,
    private board: RecruitingBoardRepository,
    private teamNeeds: TeamNeedsRepository,
    private workflow: RecruitingWorkflowService,
  ) {}

  async getActionQueue(orgId: string): Promise<ActionGroup[]> {
    const [players, needs, defaultBoard, workflows] = await Promise.all([
      this.players.list(),
      this.teamNeeds.listPositionNeeds(orgId),
      this.board.getDefaultBoard(orgId),
      this.workflow.listWorkflows(orgId),
    ]);
    const entries = defaultBoard ? await this.board.listEntries(defaultBoard.id) : [];
    const boardedIds = new Set(entries.map((e) => e.playerId));
    const now = Date.now();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const groups: ActionGroup[] = [];

    // 1) Prospects on the board awaiting first evaluation (Needs Review stage).
    const toReview = entries
      .filter((e) => e.canonicalStage === "NEEDS_REVIEW")
      .sort((a, b) => (b.playerStamp.fitScore ?? 0) - (a.playerStamp.fitScore ?? 0));
    if (toReview.length) {
      groups.push({
        id: "review",
        tone: "target",
        title: "High-fit prospects to review",
        detail: `${toReview.length} on the board awaiting a first evaluation`,
        count: toReview.length,
        cta: { label: "Open board", href: "/board" },
        items: toReview.slice(0, 4).map((e) => ({
          id: e.playerId,
          label: e.playerStamp.fullName,
          sublabel: `${e.playerStamp.primaryPosition} · ${e.playerStamp.fitScore ?? "—"} fit`,
          href: `/players/${e.playerId}`,
        })),
      });
    }

    // 2) Follow-ups due today (or overdue).
    const due = workflows
      .filter((w) => w.nextActionAt && Date.parse(w.nextActionAt) <= todayEnd.getTime())
      .sort((a, b) => Date.parse(a.nextActionAt!) - Date.parse(b.nextActionAt!));
    if (due.length) {
      groups.push({
        id: "followups",
        tone: "risk",
        title: "Follow-ups due",
        detail: `${due.length} tracked ${due.length === 1 ? "prospect needs" : "prospects need"} a next touch`,
        count: due.length,
        cta: { label: "Open board", href: "/board" },
        items: due.slice(0, 4).map((w) => ({
          id: w.playerId,
          label: w.playerName,
          sublabel: w.nextAction ?? "Follow up",
          href: `/players/${w.playerId}`,
        })),
      });
    }

    // 3) Critical needs with nobody actively pursued.
    const activePositions = new Set(entries.filter((e) => ACTIVE_STAGES.includes(e.canonicalStage)).map((e) => e.positionColumn));
    const uncovered = needs.filter((n) => n.priority === "CRITICAL" && !activePositions.has(n.position));
    if (uncovered.length) {
      groups.push({
        id: "uncovered",
        tone: "danger",
        title: "Critical needs with no active target",
        detail: `No prospect past Contacted at ${uncovered.map((n) => n.position).join(", ")}`,
        count: uncovered.length,
        cta: { label: "Analyze needs", href: "/needs" },
        items: uncovered.slice(0, 4).map((n) => ({
          id: n.position,
          label: `${n.position} room`,
          sublabel: `${n.projectedReturning}/${n.idealDepth} projected to return`,
          href: "/needs",
        })),
      });
    }

    // 4) Prospects stuck in a stage too long.
    const stuck = entries
      .filter((e) => STUCK_STAGES.includes(e.canonicalStage))
      .map((e) => ({ e, days: Math.floor((now - Date.parse(e.stageChangedAt)) / 86_400_000) }))
      .filter((x) => x.days >= STUCK_DAYS)
      .sort((a, b) => b.days - a.days);
    if (stuck.length) {
      groups.push({
        id: "stuck",
        tone: "risk",
        title: `Stuck ${STUCK_DAYS}+ days in a stage`,
        detail: `${stuck.length} ${stuck.length === 1 ? "prospect hasn't" : "prospects haven't"} moved recently`,
        count: stuck.length,
        cta: { label: "Open board", href: "/board" },
        items: stuck.slice(0, 4).map(({ e, days }) => ({
          id: e.playerId,
          label: e.playerStamp.fullName,
          sublabel: `${days}d in ${BOARD_STAGE_LABEL[e.canonicalStage]}`,
          href: `/players/${e.playerId}`,
        })),
      });
    }

    // 5) New recommended additions — Moneyball values that fit and aren't boarded.
    const recs = players
      .filter(
        (p) =>
          p.portalStatus === "IN_PORTAL" &&
          !boardedIds.has(p.id) &&
          (p.undervaluation ?? 0) >= 30 &&
          (p.fitScore ?? 0) >= 55,
      )
      .sort((a, b) => (b.undervaluation ?? 0) - (a.undervaluation ?? 0));
    if (recs.length) {
      groups.push({
        id: "recs",
        tone: "info",
        title: "New Moneyball values to add",
        detail: `${recs.length} undervalued portal players producing above their pedigree`,
        count: recs.length,
        cta: { label: "Open portal", href: "/portal" },
        items: recs.slice(0, 4).map((p) => ({
          id: p.id,
          label: p.fullName,
          sublabel: `${p.primaryPosition} · +${p.undervaluation} value`,
          href: `/players/${p.id}`,
        })),
      });
    }

    return groups;
  }
}
