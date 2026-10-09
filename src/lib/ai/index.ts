import "server-only";
import { AnthropicProvider } from "./anthropic";
import { DemoProvider } from "./demo";
import { AIError, type AIProvider } from "./provider";

export { AIError } from "./provider";
export type { AIProvider } from "./provider";

let cached: AIProvider | null = null;

/** Picks the provider from AI_PROVIDER ("anthropic" | "demo"). */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const choice = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (choice === "demo") {
    cached = new DemoProvider();
  } else if (choice === "anthropic") {
    cached = new AnthropicProvider({
      model: process.env.ANTHROPIC_MODEL || undefined,
      effort: (process.env.ANTHROPIC_EFFORT as "low" | "medium" | "high" | undefined) || undefined,
    });
  } else {
    throw new AIError(`Unknown AI_PROVIDER "${choice}"`, "The AI service is not configured. Contact support.");
  }
  return cached;
}
