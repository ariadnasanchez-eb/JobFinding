import { describe, expect, it } from "vitest";
import { profileCompleteness, profileFormSchema } from "@/lib/services/profile";

const base = {
  currentRole: "Engineering Manager", targetRoles: "Product Manager, TPM, Product Manager", seniority: "lead",
  yearsExperience: "12", location: "Barcelona", remotePreference: "remote", countries: "Spain", salaryTarget: "85k",
  salaryMinimum: "70.000 €", skills: "agile,\nleadership", industries: "", preferredCompanySize: "", linkedinUrl: "",
  careerGoal: "",
};

describe("profileFormSchema", () => {
  it("parses lists, euro amounts and empty optionals", () => {
    const out = profileFormSchema.parse(base);
    expect(out.targetRoles).toEqual(["Product Manager", "TPM"]);
    expect(out.skills).toEqual(["agile", "leadership"]);
    expect(out.salaryTarget).toBe(85000);
    expect(out.salaryMinimum).toBe(70000);
    expect(out.yearsExperience).toBe(12);
    expect(out.industries).toEqual([]);
    expect(out.linkedinUrl).toBeNull();
  });

  it("rejects a minimum above the target, no target roles, bad numbers and non-LinkedIn URLs", () => {
    const issues = (over: Record<string, string>) =>
      profileFormSchema.safeParse({ ...base, ...over }).error?.issues.map((i) => i.path[0]);
    expect(issues({ salaryMinimum: "90000" })).toEqual(["salaryMinimum"]);
    expect(issues({ targetRoles: " , " })).toEqual(["targetRoles"]);
    expect(issues({ yearsExperience: "lots" })).toEqual(["yearsExperience"]);
    expect(issues({ linkedinUrl: "https://evil.example.com" })).toEqual(["linkedinUrl"]);
  });
});

describe("profileCompleteness", () => {
  it("is 0 with nothing and counts the CV", () => {
    expect(profileCompleteness(null, false)).toBe(0);
    expect(profileCompleteness(null, true)).toBe(10);
  });
});
