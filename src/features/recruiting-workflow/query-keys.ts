import type { RecruitingWorkflowMetricsFilters } from "./types";

export const recruitingWorkflowKeys = {
  all: ["recruiting-workflow"] as const,
  workflows: () => [...recruitingWorkflowKeys.all, "player"] as const,
  workflow: (playerId: string) =>
    [...recruitingWorkflowKeys.workflows(), playerId] as const,
  metricsRoot: () => [...recruitingWorkflowKeys.all, "metrics"] as const,
  metrics: (filters: RecruitingWorkflowMetricsFilters = {}) =>
    [...recruitingWorkflowKeys.metricsRoot(), filters] as const,
  owners: () => [...recruitingWorkflowKeys.all, "owners"] as const,
};
