"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { RecruitingStatus } from "@/types/recruiting-workflow";
import {
  addRecruitingNoteAction,
  assignRecruitingOwnerAction,
  getRecruitingOwnersAction,
  getRecruitingWorkflowAction,
  getRecruitingWorkflowMetricsAction,
  logRecruitingContactAction,
  scheduleRecruitingVisitAction,
  setRecruitingNextActionAction,
  updateRecruitingOfferAction,
  updateRecruitingPriorityAction,
  updateRecruitingStatusAction,
} from "./actions";
import { recruitingWorkflowKeys } from "./query-keys";
import type {
  LogRecruitingContactInput,
  RecruitingOwner,
  RecruitingPriority,
  RecruitingWorkflow,
  RecruitingWorkflowMetrics,
  RecruitingWorkflowMetricsFilters,
  ScheduleRecruitingVisitInput,
  SetNextActionInput,
  UpdateRecruitingOfferInput,
} from "./types";

type WorkflowQueryOptions = Omit<
  UseQueryOptions<RecruitingWorkflow>,
  "queryKey" | "queryFn"
>;

export function useRecruitingWorkflow(
  playerId: string,
  options: WorkflowQueryOptions = {},
) {
  return useQuery({
    queryKey: recruitingWorkflowKeys.workflow(playerId),
    queryFn: () => getRecruitingWorkflowAction(playerId),
    enabled: Boolean(playerId),
    ...options,
  });
}

export function useRecruitingOwners() {
  return useQuery<RecruitingOwner[]>({
    queryKey: recruitingWorkflowKeys.owners(),
    queryFn: getRecruitingOwnersAction,
    staleTime: 5 * 60_000,
  });
}

export function useRecruitingWorkflowMetrics(
  filters: RecruitingWorkflowMetricsFilters = {},
) {
  return useQuery<RecruitingWorkflowMetrics>({
    queryKey: recruitingWorkflowKeys.metrics(filters),
    queryFn: () => getRecruitingWorkflowMetricsAction(filters),
  });
}

function useWorkflowMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<RecruitingWorkflow>,
  getPlayerId: (variables: TVariables) => string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (workflow, variables) => {
      const playerId = getPlayerId(variables);
      queryClient.setQueryData(
        recruitingWorkflowKeys.workflow(playerId),
        workflow,
      );
      void queryClient.invalidateQueries({
        queryKey: recruitingWorkflowKeys.metricsRoot(),
      });
    },
  });
}

export function useUpdateRecruitingStatus() {
  return useWorkflowMutation(
    ({ playerId, status }: { playerId: string; status: RecruitingStatus }) =>
      updateRecruitingStatusAction(playerId, status),
    (variables) => variables.playerId,
  );
}

export function useAssignRecruitingOwner() {
  return useWorkflowMutation(
    ({ playerId, ownerId }: { playerId: string; ownerId: string | null }) =>
      assignRecruitingOwnerAction(playerId, ownerId),
    (variables) => variables.playerId,
  );
}

export function useUpdateRecruitingPriority() {
  return useWorkflowMutation(
    ({
      playerId,
      priority,
    }: {
      playerId: string;
      priority: RecruitingPriority;
    }) => updateRecruitingPriorityAction(playerId, priority),
    (variables) => variables.playerId,
  );
}

export function useAddRecruitingNote() {
  return useWorkflowMutation(
    ({ playerId, body }: { playerId: string; body: string }) =>
      addRecruitingNoteAction(playerId, body),
    (variables) => variables.playerId,
  );
}

export function useSetRecruitingNextAction() {
  return useWorkflowMutation(
    (input: SetNextActionInput) => setRecruitingNextActionAction(input),
    (input) => input.playerId,
  );
}

export function useLogRecruitingContact() {
  return useWorkflowMutation(
    (input: LogRecruitingContactInput) => logRecruitingContactAction(input),
    (input) => input.playerId,
  );
}

export function useScheduleRecruitingVisit() {
  return useWorkflowMutation(
    (input: ScheduleRecruitingVisitInput) =>
      scheduleRecruitingVisitAction(input),
    (input) => input.playerId,
  );
}

export function useUpdateRecruitingOffer() {
  return useWorkflowMutation(
    (input: UpdateRecruitingOfferInput) => updateRecruitingOfferAction(input),
    (input) => input.playerId,
  );
}
