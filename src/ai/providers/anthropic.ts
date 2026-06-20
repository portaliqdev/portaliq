import type { AIProvider } from "../ai-provider";
import type { PortalTools } from "../tools";

/**
 * Phase 2 — real LLM provider. Defaults to the latest Claude model, Opus 4.8
 * (`claude-opus-4-8`), via the Anthropic SDK. It will use tool use / function
 * calling (the PortalTools become tool definitions), adaptive thinking, and
 * structured outputs validated by the same Zod contracts the mock provider
 * targets. Real calls run server-side only (app/api/ai) to keep keys off the
 * client. Not implemented in Phase 1.
 */
export class AnthropicAIProvider implements AIProvider {
  readonly model = "claude-opus-4-8";
  constructor(private tools: PortalTools) {
    void this.tools;
  }
  private notImplemented(): never {
    throw new Error(
      "Anthropic provider is not implemented in Phase 1. Set NEXT_PUBLIC_AI_BACKEND=mock.",
    );
  }
  async answerQuery() { return this.notImplemented(); }
  async generateScoutingReport() { return this.notImplemented(); }
  async analyzeTeamNeeds() { return this.notImplemented(); }
}
