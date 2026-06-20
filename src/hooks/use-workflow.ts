"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  addWorkflowNoteAction,
  assignWorkflowOwnerAction,
  getWorkflowAction,
  getWorkflowMetricsAction,
  logWorkflowContactAction,
  markWorkflowOfferAction,
  scheduleWorkflowVisitAction,
  setWorkflowNextActionAction,
  setWorkflowPriorityAction,
  setWorkflowStatusAction,
} from "@/app/_actions/workflow";
import type { RecruitingPriority, RecruitingStatus } from "@/types/recruiting-workflow";

export function useWorkflow(playerId: string) {
  return useQuery({
    queryKey: ["workflow", playerId],
    queryFn: () => getWorkflowAction(playerId),
  });
}

export function useWorkflowMetrics() {
  return useQuery({ queryKey: ["workflow-metrics"], queryFn: getWorkflowMetricsAction });
}

/** Mutations for one player's workflow. Invalidates the workflow + metrics on success. */
export function useWorkflowActions(playerId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ["workflow", playerId] });
    qc.invalidateQueries({ queryKey: ["workflow-metrics"] });
    router.refresh();
  };
  return {
    setStatus: useMutation({ mutationFn: (a: [RecruitingStatus, string?]) => setWorkflowStatusAction(playerId, ...a), onSuccess }),
    setPriority: useMutation({ mutationFn: (a: [RecruitingPriority]) => setWorkflowPriorityAction(playerId, ...a), onSuccess }),
    assignOwner: useMutation({ mutationFn: (a: [boolean]) => assignWorkflowOwnerAction(playerId, ...a), onSuccess }),
    addNote: useMutation({ mutationFn: (a: [string]) => addWorkflowNoteAction(playerId, ...a), onSuccess }),
    logContact: useMutation({ mutationFn: (a: ["CALL" | "TEXT" | "EMAIL", string?]) => logWorkflowContactAction(playerId, ...a), onSuccess }),
    scheduleVisit: useMutation({ mutationFn: (a: [string, string?]) => scheduleWorkflowVisitAction(playerId, ...a), onSuccess }),
    markOffer: useMutation({ mutationFn: (a: [string?]) => markWorkflowOfferAction(playerId, ...a), onSuccess }),
    setNextAction: useMutation({ mutationFn: (a: [string, string?]) => setWorkflowNextActionAction(playerId, ...a), onSuccess }),
  };
}
