import type { FitScoreService } from "./fit-score.service";
import type { SearchService } from "./search.service";
import type { BoardService } from "./board.service";
import type { TeamNeedsService } from "./team-needs.service";
import type { DashboardService } from "./dashboard.service";
import type { ReportsService } from "./reports.service";
import type { RecruitingWorkflowService } from "./recruiting-workflow.service";
import type { RosterImpactService } from "./roster-impact.service";
import type { ActionsService } from "./actions.service";
import type { AIProvider } from "@/ai";

/** The full service surface the DI container exposes to hooks. */
export interface Services {
  fitScore: FitScoreService;
  search: SearchService;
  board: BoardService;
  teamNeeds: TeamNeedsService;
  dashboard: DashboardService;
  reports: ReportsService;
  workflow: RecruitingWorkflowService;
  rosterImpact: RosterImpactService;
  actions: ActionsService;
  ai: AIProvider;
}

export type { FitBreakdown, FitComponent } from "./fit-score.service";
export type { PlayerDetail, PortalFacets } from "./search.service";
export type { BoardView, BoardColumn } from "./board.service";
export type { NeedsView, NeedsSummary, NeedRecommendation } from "./team-needs.service";
export type { DashboardData, DashboardKpis, DashboardAlert, RecentEval } from "./dashboard.service";
export type { PositionRanking, ConferenceRow } from "./reports.service";
export type { RecruitingWorkflowMetrics } from "./recruiting-workflow.service";
export type { RosterImpact, ProjectedRole } from "./roster-impact.service";
export type { ActionGroup, ActionItem, ActionTone } from "./actions.service";
