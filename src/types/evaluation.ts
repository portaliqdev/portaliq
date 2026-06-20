import { z } from "zod";
import { EvaluationTier, StaffRoleLike } from "./_shared";

export const EvaluationStage = z.enum([
  "SCREEN", "FILM", "ANALYTICS", "MEASURABLES", "SCHEME_FIT", "CHARACTER", "FINAL",
]);
export type EvaluationStage = z.infer<typeof EvaluationStage>;

export const GradeScale = z.enum(["TIER", "NUM_5", "NUM_99"]);
export type GradeScale = z.infer<typeof GradeScale>;

export const Confidence = z.enum(["LOW", "MED", "HIGH"]);
export type Confidence = z.infer<typeof Confidence>;

export const EvaluationSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  playerId: z.string(),
  evaluatorId: z.string(),
  evaluatorName: z.string().optional(),
  evaluatorRole: StaffRoleLike,
  stage: EvaluationStage,
  gradeScale: GradeScale,
  tier: EvaluationTier.optional(),
  numericGrade: z.number().optional(),
  schemeFitScore: z.number().optional(),
  filmReviewed: z.boolean().default(false),
  notes: z.string().optional(),
  facetGrades: z.record(z.string(), z.number()).optional(),
  confidence: Confidence.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;
