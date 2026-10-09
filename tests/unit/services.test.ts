import { describe, expect, it } from "vitest";
import type { AIProvider, StructuredRequest } from "@/lib/ai/provider";
import type { MatchAssessment, ParsedJob, ParsedResume } from "@/lib/ai/schemas";
import { parseResume } from "@/lib/services/resumeParser";
import { parseJob } from "@/lib/services/jobParser";
import { matchJob, type MatchProfile } from "@/lib/services/jobMatcher";

/** A provider that returns canned output and records what it was sent. */
function fakeProvider(output: unknown) {
  const calls: StructuredRequest<unknown>[] = [];
  const provider: AIProvider = {
    name: "fake",
    isDemo: false,
    async generate<T>(req: StructuredRequest<T>): Promise<T> {
      calls.push(req as StructuredRequest<unknown>);
      return req.schema.parse(output);
    },
  };
  return { provider, calls };
}

const resume: ParsedResume = {
  current_role: "Engineering Manager", summary: "", years_experience: 12, seniority: "lead", location: "Barcelona",
  suggested_target_roles: ["Engineering Manager", "engineering manager", "TPM", "PM", "Head of Eng"],
  skills: ["Java", " java ", "AWS", ""], industries: ["Events"], experience: [], achievements: [], education: [], languages: [],
};

describe("parseResume", () => {
  it("redacts contact details before calling the provider and de-duplicates lists", async () => {
    const { provider, calls } = fakeProvider(resume);
    const out = await parseResume(provider, "Laura laura@example.com +34 612 345 678\nEngineering Manager", "en");
    expect(calls[0].prompt).not.toContain("laura@example.com");
    expect(calls[0].prompt).not.toContain("612 345 678");
    expect(calls[0].prompt).toContain("<cv>");
    expect(out.skills).toEqual(["java", "AWS"]);
    expect(out.suggested_target_roles).toHaveLength(4);
  });

  it("asks for Spanish output when the user's language is Spanish", async () => {
    const { provider, calls } = fakeProvider(resume);
    await parseResume(provider, "x".repeat(300), "es");
    expect(calls[0].system).toContain("Spanish");
  });

  it("drops impossible years of experience", async () => {
    const { provider } = fakeProvider({ ...resume, years_experience: 99 });
    expect((await parseResume(provider, "x", "en")).years_experience).toBeNull();
  });
});

const parsedJob: ParsedJob = {
  title: "Senior TPM", company: "Finlane", location: "Barcelona", work_mode: "onsite", onsite_days_per_week: 5,
  countries_allowed: [], salary_min_eur: 90000, salary_max_eur: 60000, salary_text: null, seniority: "senior",
  years_experience_required: 8, industry: "fintech", must_have: ["program management"], nice_to_have: [],
  responsibilities: [], languages_required: [],
};

describe("parseJob", () => {
  it("swaps an inverted salary range and keeps sane values", async () => {
    const { provider } = fakeProvider(parsedJob);
    const out = await parseJob(provider, "job", "en");
    expect([out.salary_min_eur, out.salary_max_eur]).toEqual([60000, 90000]);
  });

  it("discards salaries that are clearly not annual EUR", async () => {
    const { provider } = fakeProvider({ ...parsedJob, salary_min_eur: 45, salary_max_eur: 60 });
    const out = await parseJob(provider, "job", "en");
    expect(out.salary_min_eur).toBeNull();
    expect(out.salary_max_eur).toBeNull();
  });
});

const assessment: MatchAssessment = {
  experience: { score: 90, rationale: "12 years vs 8 required" },
  skills: { score: 140, rationale: "over-scored on purpose" },
  seniority: { score: 85, rationale: "" },
  industry: { score: 50, rationale: "" },
  strengths: [{ point: "Payments", evidence: "Payments platform at ShopNow", source: "cv" }],
  gaps: [],
  risks: [{ risk: "No fintech compliance experience", severity: "low" }],
  recommendation: "APPLY",
  reasoning: "Good fit.",
};

const profile: MatchProfile = {
  currentRole: "Engineering Manager", targetRoles: ["TPM"], seniority: "lead", yearsExperience: 12, skills: ["AWS"],
  industries: ["Events"], careerGoal: null, remotePreference: "remote", countries: ["Spain"], location: "Barcelona",
  salaryTarget: 85000, salaryMinimum: 70000,
};

describe("matchJob", () => {
  it("computes the overall score in code, clamps AI scores and merges computed risks first", async () => {
    const { provider, calls } = fakeProvider(assessment);
    const job = { ...parsedJob, salary_min_eur: 50000, salary_max_eur: 60000 };
    const out = await matchJob(provider, { profile, resume, resumeText: "Contact: laura@example.com", job, jobDescription: "desc" }, "en");

    expect(out.breakdown.skills.score).toBe(100);
    expect(out.breakdown.location.score).toBe(15);
    expect(out.breakdown.salary.status).toBe("concern");
    // 90*.3 + 100*.3 + 85*.15 + 50*.1 + 15*.15
    expect(out.matchScore).toBe(77);
    expect(out.risks.map((r) => r.severity)).toEqual(["high", "high", "low"]);
    expect(out.recommendation).toBe("APPLY");

    // The prompt carries the computed checks but no contact details.
    expect(calls[0].prompt).toContain("<computed_checks>");
    expect(calls[0].prompt).not.toContain("laura@example.com");
  });
});
