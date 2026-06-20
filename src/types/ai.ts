import { z } from "zod";
import { EvaluationTier } from "./enums";

export const AIInsightKind = z.enum([
  "SCOUTING_REPORT", "FIT_ANALYSIS", "COMP", "RISK_FLAG", "SUMMARY",
]);
export type AIInsightKind = z.infer<typeof AIInsightKind>;

export const AIConfidence = z.enum(["LOW", "MED", "HIGH"]);
export type AIConfidence = z.infer<typeof AIConfidence>;

export const SourceRefSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const AIInsightSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerId: z.string(),
  type: AIInsightKind,
  model: z.string(),
  headline: z.string(),
  summary: z.string(),
  body: z.string().optional(),
  fitScore: z.number().optional(),
  confidence: AIConfidence,
  strengths: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
  comparablePlayers: z.array(z.string()).default([]),
  sourceRefs: z.array(SourceRefSchema).default([]),
  generatedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AIInsight = z.infer<typeof AIInsightSchema>;

/* ──────────────────────────────────────────────────────────────────────────
 * AIProvider I/O contracts (ai-system-design.md §3, §8)
 * ────────────────────────────────────────────────────────────────────────── */

/** Strict output contract for a generated scouting report. */
export const ScoutingReportOutputSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  riskFactors: z.array(z.string()),
  developmentPotential: z.string(),
  schemeFit: z.string(),
  projection: EvaluationTier,
  role: z.string(),
  bottomLine: z.string(),
  comparablePlayers: z.array(z.string()),
  confidence: AIConfidence,
  sourceRefs: z.array(SourceRefSchema),
});
export type ScoutingReportOutput = z.infer<typeof ScoutingReportOutputSchema>;

export interface ScoutingReportInput {
  playerId: string;
}

/** Assistant tool-call transparency (mirrors Phase-2 function calling). */
export interface AssistantToolCall {
  tool:
    | "searchPlayers"
    | "comparePlayers"
    | "getTeamNeeds"
    | "getPlayer"
    | "findSimilarPlayers";
  args: Record<string, unknown>;
  resultSummary: string;
}

export interface AssistantQuery {
  question: string;
}

export interface AssistantAnswer {
  answer: string; // markdown
  playerIds: string[];
  toolCalls: AssistantToolCall[];
  followUps: string[];
  confidence: AIConfidence;
}

export interface TeamNeedsAnalysis {
  headline: string;
  summary: string;
  priorities: { position: string; rationale: string; needScore: number }[];
  recommendedTargets: { playerId: string; reason: string }[];
}
