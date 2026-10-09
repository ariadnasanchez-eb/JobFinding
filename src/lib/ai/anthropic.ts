import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AIError, type AIProvider, type StructuredRequest } from "./provider";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export class AnthropicProvider implements AIProvider {
  readonly name: string;
  readonly isDemo = false;
  private client: Anthropic;
  private model: string;
  private effort: Effort;

  constructor(opts: { apiKey?: string; model?: string; effort?: Effort } = {}) {
    this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
    this.model = opts.model ?? "claude-opus-5-5";
    this.effort = opts.effort ?? "medium";
    this.name = `anthropic:${this.model}`;
  }

  async generate<T>(req: StructuredRequest<T>): Promise<T> {
    // One retry if the model returns output that fails schema validation.
    for (let attempt = 0; attempt < 2; attempt++) {
      let response;
      try {
        response = await this.client.beta.messages.parse({
          model: this.model,
          max_tokens: 16000,
          system: req.system,
          messages: [{ role: "user", content: req.prompt }],
          output_config: { effort: this.effort, format: betaZodOutputFormat(req.schema) },
          // Re-run on Anthropic's recommended model if a safety classifier declines.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
      } catch (error) {
        throw toAIError(error);
      }

      if (response.stop_reason === "refusal") {
        throw new AIError(
          `Model declined (${response.stop_details?.category ?? "unknown"})`,
          "The AI declined to process this content. Please check the text and try again.",
        );
      }
      if (response.stop_reason === "max_tokens") {
        throw new AIError("Output truncated at max_tokens", "The input was too long to analyse in one pass. Try a shorter text.");
      }
      const parsed = req.schema.safeParse(response.parsed_output);
      if (parsed.success) return parsed.data;
    }
    throw new AIError(
      `${req.task}: model output failed schema validation twice`,
      "The AI returned an unexpected answer. Please try again.",
      true,
    );
  }
}

function toAIError(error: unknown): AIError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new AIError("Invalid Anthropic API key", "The AI service is not configured correctly. Contact support.");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AIError("Rate limited", "The AI service is busy. Please try again in a minute.", true);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new AIError(`Bad request: ${error.message}`, "The AI could not process this input.");
  }
  if (error instanceof Anthropic.APIError) {
    return new AIError(`API error ${error.status}: ${error.message}`, "The AI service had a problem. Please try again.", true);
  }
  return new AIError(String(error), "Could not reach the AI service. Please try again.", true);
}
