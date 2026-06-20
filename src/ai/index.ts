import { MockAIProvider } from "./providers/mock";
import { AnthropicAIProvider } from "./providers/anthropic";
import { GeminiAIProvider } from "./providers/gemini";
import type { AIProvider } from "./ai-provider";
import type { PortalTools } from "./tools";

/** Provider selection — the AI analogue of the data-backend swap in di.ts. */
export function createAIProvider(tools: PortalTools): AIProvider {
  const backend = process.env.NEXT_PUBLIC_AI_BACKEND ?? "mock";
  switch (backend) {
    case "gemini":
      return new GeminiAIProvider(tools);
    case "anthropic":
      return new AnthropicAIProvider(tools);
    default:
      return new MockAIProvider(tools);
  }
}

export type { AIProvider } from "./ai-provider";
export type { PortalTools } from "./tools";
export { MockPortalTools } from "./tools";
