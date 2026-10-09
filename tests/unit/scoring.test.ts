import { describe, expect, it } from "vitest";
import type { ParsedJob } from "@/lib/ai/schemas";
import { assessLocation, assessSalary, clampScore, overallScore, type ProfileFacts } from "@/lib/services/scoring";

const job = (over: Partial<ParsedJob> = {}): ParsedJob => ({
  title: "PM", company: null, location: null, work_mode: "remote", onsite_days_per_week: null, countries_allowed: [],
  salary_min_eur: null, salary_max_eur: null, salary_text: null, seniority: "senior", years_experience_required: null,
  industry: null, must_have: [], nice_to_have: [], responsibilities: [], languages_required: [], ...over,
});
const profile = (over: Partial<ProfileFacts> = {}): ProfileFacts => ({
  remotePreference: "remote", countries: ["Spain"], location: "Barcelona", salaryTarget: 85000, salaryMinimum: 70000, ...over,
});

describe("assessLocation", () => {
  it("is a full match for a remote job and a remote preference", () => {
    expect(assessLocation(profile(), job())).toMatchObject({ score: 100, risks: [] });
  });

  it("flags an onsite job as a high risk for someone who wants remote", () => {
    const fit = assessLocation(profile(), job({ work_mode: "onsite", onsite_days_per_week: 5 }));
    expect(fit.score).toBe(15);
    expect(fit.risks[0]).toMatchObject({ severity: "high" });
    expect(fit.risks[0].risk).toContain("5 days");
  });

  it("caps the score when the job can't hire in the user's countries", () => {
    const fit = assessLocation(profile(), job({ countries_allowed: ["Germany"] }));
    expect(fit.score).toBe(30);
    expect(fit.risks.some((r) => r.severity === "high")).toBe(true);
  });

  it("treats Europe-wide hiring as compatible", () => {
    expect(assessLocation(profile(), job({ countries_allowed: ["Europe"] })).score).toBe(100);
  });

  it("is neutral when the user has no preference", () => {
    expect(assessLocation(profile({ remotePreference: null }), job({ work_mode: "onsite" })).score).toBe(70);
  });
});

describe("assessSalary", () => {
  it("is unknown without a published salary", () => {
    expect(assessSalary(profile(), job()).status).toBe("unknown");
  });

  it("is compatible when the top of the range reaches the target", () => {
    expect(assessSalary(profile(), job({ salary_min_eur: 75000, salary_max_eur: 90000 })).status).toBe("compatible");
  });

  it("is a medium concern below target and a high concern below minimum", () => {
    const belowTarget = assessSalary(profile(), job({ salary_max_eur: 80000 }));
    expect(belowTarget).toMatchObject({ status: "concern", risks: [{ severity: "medium" }] });
    const belowMin = assessSalary(profile(), job({ salary_min_eur: 50000, salary_max_eur: 60000 }));
    expect(belowMin).toMatchObject({ status: "concern", risks: [{ severity: "high" }] });
  });
});

describe("overallScore", () => {
  it("weights dimensions and stays within 0-100", () => {
    expect(overallScore({ experience: 100, skills: 100, seniority: 100, industry: 100, location: 100 })).toBe(100);
    expect(overallScore({ experience: 80, skills: 60, seniority: 100, industry: 50, location: 100 })).toBe(77);
    expect(overallScore({ experience: 500, skills: -20, seniority: NaN, industry: 0, location: 0 })).toBe(30);
  });

  it("clamps and rounds", () => {
    expect(clampScore(101.6)).toBe(100);
    expect(clampScore(-3)).toBe(0);
    expect(clampScore(54.5)).toBe(55);
  });
});
