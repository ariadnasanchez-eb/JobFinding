import type { AIProvider } from "@/lib/ai/provider";
import { parsedResumeSchema, type ParsedResume } from "@/lib/ai/schemas";
import { redactContactDetails } from "@/lib/cv/extract";
import { EVIDENCE_RULES, document, languageInstruction, type OutputLanguage } from "./prompts";

const SYSTEM = `You are resume_parser, part of a career coaching product for experienced tech professionals in Europe.
You turn the raw text of a CV into structured data.

${EVIDENCE_RULES}
- years_experience: total years of professional experience, computed from the dates in the CV.
- seniority: your best reading of the person's level from titles, scope and years.
- suggested_target_roles: up to 4 role titles this person is credibly qualified for today, based on the CV.
- achievements: measurable outcomes only (numbers, percentages, money, scale), quoted as close to the CV wording as possible.
- skills: concrete skills and technologies named or clearly demonstrated, de-duplicated, max 30.`;

const uniq = (items: string[], max: number) =>
  [...new Map(items.map((s) => s.trim()).filter(Boolean).map((s) => [s.toLowerCase(), s])).values()].slice(0, max);

export async function parseResume(provider: AIProvider, cvText: string, lang: OutputLanguage): Promise<ParsedResume> {
  const redacted = redactContactDetails(cvText);
  const parsed = await provider.generate({
    task: "resume_parser",
    system: `${SYSTEM}\n${languageInstruction(lang)}`,
    prompt: `Parse this CV.\n\n${document("cv", redacted)}`,
    schema: parsedResumeSchema,
    input: { text: redacted },
  });
  const years = parsed.years_experience;
  return {
    ...parsed,
    years_experience: years == null || years < 0 || years > 60 ? null : Math.round(years),
    skills: uniq(parsed.skills, 30),
    industries: uniq(parsed.industries, 10),
    suggested_target_roles: uniq(parsed.suggested_target_roles, 4),
  };
}
