import type {
  AssistantQuery,
  AssistantAnswer,
  ScoutingReportOutput,
  TeamNeedsAnalysis,
} from "@/types/ai";

/**
 * The AI boundary (system-architecture.md §9). Features never call an LLM SDK
 * directly — they call this interface. Phase 1 = MockAIProvider (deterministic,
 * grounded). Phase 2 = AnthropicAIProvider (Claude Opus 4.8) behind the same shape.
 */
export interface AIProvider {
  readonly model: string;
  answerQuery(input: AssistantQuery): Promise<AssistantAnswer>;
  generateScoutingReport(playerId: string): Promise<ScoutingReportOutput>;
  analyzeTeamNeeds(): Promise<TeamNeedsAnalysis>;
}
