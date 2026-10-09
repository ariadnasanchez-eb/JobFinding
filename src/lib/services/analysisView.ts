import { z } from "zod/v4";
import { RECOMMENDATIONS } from "@/lib/ai/schemas";

const dim = z.object({ score: z.number(), rationale: z.string() });

/** Shape of a stored JobAnalysis, re-validated on read so old/malformed rows can't break the page. */
export const storedAnalysisSchema = z.object({
  matchScore: z.number(),
  breakdown: z.object({
    experience: dim,
    skills: dim,
    seniority: dim,
    industry: dim,
    location: dim,
    salary: z.object({ status: z.enum(["unknown", "compatible", "concern"]), rationale: z.string() }),
  }),
  strengths: z.array(z.object({ point: z.string(), evidence: z.string(), source: z.enum(["cv", "profile"]) })),
  gaps: z.array(z.object({ requirement: z.string(), importance: z.enum(["must_have", "nice_to_have"]), detail: z.string() })),
  risks: z.array(z.object({ risk: z.string(), severity: z.enum(["high", "medium", "low"]) })),
  recommendation: z.enum(RECOMMENDATIONS),
  reasoning: z.string(),
});
export type StoredAnalysis = z.infer<typeof storedAnalysisSchema>;

export const RECOMMENDATION_LABEL: Record<StoredAnalysis["recommendation"], { label: string; className: string }> = {
  STRONGLY_APPLY: { label: "Strongly apply", className: "bg-emerald-600 text-white" },
  APPLY: { label: "Apply", className: "bg-emerald-100 text-emerald-900" },
  APPLY_IF_INTERESTED: { label: "Apply if interested", className: "bg-sky-100 text-sky-900" },
  LOW_PRIORITY: { label: "Low priority", className: "bg-amber-100 text-amber-900" },
  DO_NOT_APPLY: { label: "Do not apply", className: "bg-red-100 text-red-900" },
};

export function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-sky-700";
  if (score >= 45) return "text-amber-700";
  return "text-red-700";
}
