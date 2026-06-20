import { z } from "zod";
import { EvaluationTier } from "./enums";

export const ScoutingReportSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerId: z.string(),
  authorId: z.string(),
  authorName: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  schemeFitNotes: z.string().optional(),
  projection: EvaluationTier.optional(),
  comparablePlayer: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ScoutingReport = z.infer<typeof ScoutingReportSchema>;
