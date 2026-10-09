import { z } from "zod/v4";

// Schemas the LLM must fill. Kept free of numeric/length constraints so they
// map cleanly onto structured-output JSON Schema; values are clamped and
// normalised in code after validation.

export const SENIORITY = ["junior", "mid", "senior", "lead", "principal", "executive", "unknown"] as const;
export const WORK_MODES = ["remote", "hybrid", "onsite", "unknown"] as const;
export const RECOMMENDATIONS = [
  "STRONGLY_APPLY",
  "APPLY",
  "APPLY_IF_INTERESTED",
  "LOW_PRIORITY",
  "DO_NOT_APPLY",
] as const;

export const parsedResumeSchema = z.object({
  current_role: z.string().nullable(),
  summary: z.string(),
  years_experience: z.number().nullable(),
  seniority: z.enum(SENIORITY),
  location: z.string().nullable(),
  suggested_target_roles: z.array(z.string()),
  skills: z.array(z.string()),
  industries: z.array(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      start: z.string().nullable(),
      end: z.string().nullable(),
      highlights: z.array(z.string()),
    }),
  ),
  achievements: z.array(
    z.object({
      text: z.string(),
      metric: z.string().nullable(),
      company: z.string().nullable(),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string().nullable(),
      year: z.string().nullable(),
    }),
  ),
  languages: z.array(z.string()),
});
export type ParsedResume = z.infer<typeof parsedResumeSchema>;

export const parsedJobSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  work_mode: z.enum(WORK_MODES),
  onsite_days_per_week: z.number().nullable(),
  countries_allowed: z.array(z.string()),
  salary_min_eur: z.number().nullable(),
  salary_max_eur: z.number().nullable(),
  salary_text: z.string().nullable(),
  seniority: z.enum(SENIORITY),
  years_experience_required: z.number().nullable(),
  industry: z.string().nullable(),
  must_have: z.array(z.string()),
  nice_to_have: z.array(z.string()),
  responsibilities: z.array(z.string()),
  languages_required: z.array(z.string()),
});
export type ParsedJob = z.infer<typeof parsedJobSchema>;

const dimension = z.object({ score: z.number(), rationale: z.string() });

export const matchAssessmentSchema = z.object({
  experience: dimension,
  skills: dimension,
  seniority: dimension,
  industry: dimension,
  strengths: z.array(
    z.object({
      point: z.string(),
      evidence: z.string(),
      source: z.enum(["cv", "profile"]),
    }),
  ),
  gaps: z.array(
    z.object({
      requirement: z.string(),
      importance: z.enum(["must_have", "nice_to_have"]),
      detail: z.string(),
    }),
  ),
  risks: z.array(
    z.object({
      risk: z.string(),
      severity: z.enum(["high", "medium", "low"]),
    }),
  ),
  recommendation: z.enum(RECOMMENDATIONS),
  reasoning: z.string(),
});
export type MatchAssessment = z.infer<typeof matchAssessmentSchema>;
