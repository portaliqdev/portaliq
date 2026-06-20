/**
 * Dependency Injection — THE SINGLE SWAP POINT (system-architecture.md §6).
 *
 * Nothing in app/, features/, components/, services/, or repositories/ imports
 * from adapters/* — only this file does. Flipping NEXT_PUBLIC_DATA_BACKEND from
 * "mock" to "firestore" is the entire Phase-1 → Phase-2 data migration at the
 * app layer.
 */
import type { Repositories } from "@/repositories";
import {
  MockPlayerRepository,
  MockSchoolRepository,
  MockEvaluationRepository,
  MockScoutingReportRepository,
  MockBoardRepository,
  MockTeamNeedsRepository,
  MockRosterRepository,
  MockWatchlistRepository,
  MockAIInsightRepository,
  MockUserRepository,
  MockOrganizationRepository,
  MockRecruitingWorkflowRepository,
} from "@/adapters/mock";

import { FitScoreService } from "@/services/fit-score.service";
import { SearchService } from "@/services/search.service";
import { BoardService } from "@/services/board.service";
import { TeamNeedsService } from "@/services/team-needs.service";
import { DashboardService } from "@/services/dashboard.service";
import { ReportsService } from "@/services/reports.service";
import { RecruitingWorkflowService } from "@/services/recruiting-workflow.service";
import type { Services } from "@/services";

import { MockPortalTools, createAIProvider } from "@/ai";
// Type-only throwing stub in Phase 1 — imports no Firebase, so bundling is free.
import { createFirestoreRepositories } from "@/adapters/firestore";
// Postgres (Neon) data-plane adapter — real CFBD + AI-evaluated tables.
import { createPostgresRepositories } from "@/adapters/postgres";

type Backend = "mock" | "firestore" | "postgres";
const BACKEND: Backend = (process.env.NEXT_PUBLIC_DATA_BACKEND as Backend) ?? "mock";

function buildRepositories(): Repositories {
  if (BACKEND === "firestore") {
    return createFirestoreRepositories();
  }
  if (BACKEND === "postgres") {
    return createPostgresRepositories();
  }
  return {
    players: new MockPlayerRepository(),
    schools: new MockSchoolRepository(),
    evaluations: new MockEvaluationRepository(),
    scoutingReports: new MockScoutingReportRepository(),
    board: new MockBoardRepository(),
    teamNeeds: new MockTeamNeedsRepository(),
    roster: new MockRosterRepository(),
    watchlists: new MockWatchlistRepository(),
    aiInsights: new MockAIInsightRepository(),
    users: new MockUserRepository(),
    orgs: new MockOrganizationRepository(),
    workflows: new MockRecruitingWorkflowRepository(),
  };
}

function buildServices(repos: Repositories): Services {
  const fitScore = new FitScoreService(repos.players, repos.orgs, repos.teamNeeds);
  const search = new SearchService(
    repos.players,
    repos.schools,
    repos.aiInsights,
    repos.evaluations,
    repos.scoutingReports,
    fitScore,
  );
  const board = new BoardService(repos.board, repos.users, repos.players);
  const teamNeeds = new TeamNeedsService(repos.teamNeeds, repos.roster, repos.players);
  const dashboard = new DashboardService(
    repos.players,
    repos.board,
    repos.teamNeeds,
    repos.aiInsights,
    repos.evaluations,
    repos.orgs,
  );
  const reports = new ReportsService(repos.players);
  const workflow = new RecruitingWorkflowService(repos.workflows, repos.players);
  const tools = new MockPortalTools(search, teamNeeds, repos.players, repos.orgs, workflow);
  const ai = createAIProvider(tools);

  return { fitScore, search, board, teamNeeds, dashboard, reports, workflow, ai };
}

// Singletons — built once per runtime.
const repos = buildRepositories();
const services = buildServices(repos);

export const container = { repos, services };
export const getRepositories = (): Repositories => container.repos;
export const getServices = (): Services => container.services;
export const getAI = () => container.services.ai;
