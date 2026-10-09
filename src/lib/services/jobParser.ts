import type { AIProvider } from "@/lib/ai/provider";
import { parsedJobSchema, type ParsedJob } from "@/lib/ai/schemas";
import { EVIDENCE_RULES, document, languageInstruction, type OutputLanguage } from "./prompts";

const SYSTEM = `You are job_parser. You turn a pasted job description into structured data.

${EVIDENCE_RULES}
- work_mode: "remote", "hybrid", "onsite", or "unknown" if not stated.
- countries_allowed: only when the posting restricts where candidates may live or work; otherwise empty.
- salary_min_eur / salary_max_eur: annual gross in EUR, only if a salary is published. Convert "70k" to 70000. If the currency is not EUR, leave both null and put the original text in salary_text.
- must_have: requirements the posting presents as required. nice_to_have: those marked as a plus/bonus/preferred.`;

export async function parseJob(provider: AIProvider, description: string, lang: OutputLanguage): Promise<ParsedJob> {
  const parsed = await provider.generate({
    task: "job_parser",
    system: `${SYSTEM}\n${languageInstruction(lang)}`,
    prompt: `Parse this job description.\n\n${document("job_description", description)}`,
    schema: parsedJobSchema,
    input: { description },
  });
  const money = (n: number | null) => (n == null || n < 5000 || n > 2_000_000 ? null : Math.round(n));
  let min = money(parsed.salary_min_eur);
  let max = money(parsed.salary_max_eur);
  if (min != null && max != null && min > max) [min, max] = [max, min];
  const days = parsed.onsite_days_per_week;
  return {
    ...parsed,
    salary_min_eur: min,
    salary_max_eur: max,
    onsite_days_per_week: days == null || days < 0 || days > 7 ? null : Math.round(days),
    years_experience_required:
      parsed.years_experience_required == null || parsed.years_experience_required < 0 || parsed.years_experience_required > 40
        ? null
        : parsed.years_experience_required,
  };
}
