import { describe, expect, it, vi } from "vitest";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AnthropicProvider } from "@/lib/ai/anthropic";
import { AIError } from "@/lib/ai/provider";
import { matchAssessmentSchema, parsedJobSchema, parsedResumeSchema } from "@/lib/ai/schemas";

describe("schemas", () => {
  it("convert to structured-output formats", () => {
    for (const schema of [parsedResumeSchema, parsedJobSchema, matchAssessmentSchema]) {
      expect(betaZodOutputFormat(schema).type).toBe("json_schema");
    }
  });
});

function providerWith(parse: (req: Record<string, unknown>) => unknown) {
  const provider = new AnthropicProvider({ apiKey: "test-key" });
  const fn = vi.fn(async (req: Record<string, unknown>) => parse(req));
  (provider as unknown as { client: unknown }).client = { beta: { messages: { parse: fn } } };
  return { provider, fn };
}

const request = { task: "job_parser" as const, system: "sys", prompt: "p", schema: parsedJobSchema, input: {} };
const job = {
  title: "PM", company: null, location: null, work_mode: "remote", onsite_days_per_week: null, countries_allowed: [],
  salary_min_eur: null, salary_max_eur: null, salary_text: null, seniority: "senior", years_experience_required: null,
  industry: null, must_have: [], nice_to_have: [], responsibilities: [], languages_required: [],
};

describe("AnthropicProvider", () => {
  it("sends the default model, effort, structured format and refusal fallback", async () => {
    const { provider, fn } = providerWith(() => ({ stop_reason: "end_turn", parsed_output: job }));
    await expect(provider.generate(request)).resolves.toMatchObject({ title: "PM" });
    const sent = fn.mock.calls[0][0];
    expect(sent).toMatchObject({
      model: "claude-opus-5-5",
      system: "sys",
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
      output_config: { effort: "medium" },
    });
  });

  it("retries once when output fails validation, then gives up with a friendly error", async () => {
    const { provider, fn } = providerWith(() => ({ stop_reason: "end_turn", parsed_output: { title: 3 } }));
    await expect(provider.generate(request)).rejects.toBeInstanceOf(AIError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("turns a refusal into a user-safe error without reading content", async () => {
    const { provider } = providerWith(() => ({ stop_reason: "refusal", stop_details: { category: "cyber" }, parsed_output: null }));
    await expect(provider.generate(request)).rejects.toMatchObject({ userMessage: expect.stringContaining("declined") });
  });
});
