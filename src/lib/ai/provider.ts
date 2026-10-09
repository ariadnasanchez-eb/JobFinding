import type { z } from "zod/v4";

export type AITask = "resume_parser" | "job_parser" | "job_matcher";

export interface StructuredRequest<T> {
  task: AITask;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Structured copy of the inputs, used by the demo provider instead of the prompt text. */
  input: unknown;
}

/** Any LLM backend the app can use. Swap implementations without touching the services. */
export interface AIProvider {
  readonly name: string;
  /** True when outputs are heuristic demo data rather than a real model. */
  readonly isDemo: boolean;
  generate<T>(request: StructuredRequest<T>): Promise<T>;
}

export class AIError extends Error {
  constructor(
    message: string,
    /** Safe to show to the user. */
    public readonly userMessage: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "AIError";
  }
}
