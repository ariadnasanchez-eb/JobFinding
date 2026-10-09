import type { AIProvider } from "@/lib/ai/provider";
import { matchAssessmentSchema, type MatchAssessment, type ParsedJob, type ParsedResume } from "@/lib/ai/schemas";
import { redactContactDetails } from "@/lib/cv/extract";
import { EVIDENCE_RULES, document, languageInstruction, type OutputLanguage } from "./prompts";
import {
  assessLocation,
  assessSalary,
  clampScore,
  overallScore,
  type ProfileFacts,
  type Risk,
  type SalaryStatus,
} from "./scoring";

export interface MatchProfile extends ProfileFacts {
  currentRole: string | null;
  targetRoles: string[];
  seniority: string | null;
  yearsExperience: number | null;
  skills: string[];
  industries: string[];
  careerGoal: string | null;
}

export interface MatchResult {
  matchScore: number;
  breakdown: {
    experience: { score: number; rationale: string };
    skills: { score: number; rationale: string };
    seniority: { score: number; rationale: string };
    industry: { score: number; rationale: string };
    location: { score: number; rationale: string };
    salary: { status: SalaryStatus; rationale: string };
  };
  strengths: MatchAssessment["strengths"];
  gaps: MatchAssessment["gaps"];
  risks: Risk[];
  recommendation: MatchAssessment["recommendation"];
  reasoning: string;
}

const SYSTEM = `You are job_matcher, the core of a career decision engine. You decide whether a candidate should spend time applying to a job.

You compare the candidate (profile + CV) with the job and return:
- experience, skills, seniority, industry: a score 0-100 each with a one-sentence rationale that cites specifics.
- strengths: 5-8 specific matches. Each "evidence" must point to something concrete in the CV or profile (employer, achievement, skill). source is "cv" or "profile".
- gaps: the important requirements the candidate does not evidence. Do not list trivial gaps.
- risks: other reasons the application may fail or not be worth it (e.g. a language requirement, a domain the candidate lacks, a career-direction mismatch). Location and salary checks are already computed and given to you; don't repeat them.
- recommendation: STRONGLY_APPLY, APPLY, APPLY_IF_INTERESTED, LOW_PRIORITY or DO_NOT_APPLY. Weigh the computed location and salary facts: a hard location blocker or a salary below the candidate's minimum should usually mean LOW_PRIORITY or DO_NOT_APPLY.
- reasoning: 2-4 sentences explaining the recommendation. Be direct and opinionated where the evidence supports it; never "it depends on many factors".

${EVIDENCE_RULES}
- A skill counts as a match only if the CV or profile shows it. Do not credit skills the candidate merely could learn.`;

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export async function matchJob(
  provider: AIProvider,
  input: { profile: MatchProfile; resume: ParsedResume | null; resumeText: string | null; job: ParsedJob; jobDescription: string },
  lang: OutputLanguage,
): Promise<MatchResult> {
  const { profile, resume, job } = input;
  const location = assessLocation(profile, job);
  const salary = assessSalary(profile, job);

  // Only what the match needs: no name, email or contact details.
  const candidate = {
    current_role: profile.currentRole,
    target_roles: profile.targetRoles,
    seniority: profile.seniority,
    years_experience: profile.yearsExperience,
    skills: profile.skills,
    industries: profile.industries,
    career_goal: profile.careerGoal,
    remote_preference: profile.remotePreference,
    work_countries: profile.countries,
  };

  const prompt = [
    "Assess this candidate against this job.",
    document("candidate_profile", JSON.stringify(candidate, null, 2)),
    resume ? document("cv_structured", JSON.stringify({ experience: resume.experience, achievements: resume.achievements, education: resume.education, languages: resume.languages }, null, 2)) : "",
    input.resumeText ? document("cv_text", redactContactDetails(input.resumeText)) : "",
    document("job_structured", JSON.stringify(job, null, 2)),
    document("job_description", input.jobDescription),
    document(
      "computed_checks",
      JSON.stringify({ location: { score: location.score, rationale: location.rationale }, salary: { status: salary.status, rationale: salary.rationale } }, null, 2),
    ),
  ]
    .filter(Boolean)
    .join("\n\n");

  const ai = await provider.generate({
    task: "job_matcher",
    system: `${SYSTEM}\n${languageInstruction(lang)}`,
    prompt,
    schema: matchAssessmentSchema,
    input: {
      profile: {
        skills: profile.skills,
        industries: profile.industries,
        years_experience: profile.yearsExperience,
        seniority: profile.seniority,
        target_roles: profile.targetRoles,
      },
      job,
    },
  });

  const breakdown: MatchResult["breakdown"] = {
    experience: { score: clampScore(ai.experience.score), rationale: ai.experience.rationale },
    skills: { score: clampScore(ai.skills.score), rationale: ai.skills.rationale },
    seniority: { score: clampScore(ai.seniority.score), rationale: ai.seniority.rationale },
    industry: { score: clampScore(ai.industry.score), rationale: ai.industry.rationale },
    location: { score: location.score, rationale: location.rationale },
    salary: { status: salary.status, rationale: salary.rationale },
  };

  const risks = [...location.risks, ...salary.risks, ...ai.risks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return {
    matchScore: overallScore({
      experience: breakdown.experience.score,
      skills: breakdown.skills.score,
      seniority: breakdown.seniority.score,
      industry: breakdown.industry.score,
      location: breakdown.location.score,
    }),
    breakdown,
    strengths: ai.strengths.slice(0, 8),
    gaps: ai.gaps.slice(0, 10),
    risks,
    recommendation: ai.recommendation,
    reasoning: ai.reasoning,
  };
}
