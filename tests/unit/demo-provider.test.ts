import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DemoProvider, demoParseJob, demoParseResume, salariesFromText } from "@/lib/ai/demo";
import { parsedResumeSchema } from "@/lib/ai/schemas";

const text = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

describe("demo heuristics", () => {
  it("extracts skills, years and achievements from a CV", () => {
    const cv = demoParseResume(text("sample-cv.txt"));
    expect(cv.years_experience).toBe(12);
    expect(cv.seniority).toBe("lead");
    expect(cv.skills).toEqual(expect.arrayContaining(["people management", "aws", "payments"]));
    expect(cv.achievements.some((a) => a.text.includes("105%"))).toBe(true);
    expect(cv.summary).toMatch(/^Demo data/);
  });

  it("extracts work mode, onsite days, salary and years from a job", () => {
    const job = demoParseJob(text("sample-job.txt"));
    expect(job.work_mode).toBe("hybrid");
    expect(job.onsite_days_per_week).toBe(2);
    expect([job.salary_min_eur, job.salary_max_eur]).toEqual([75000, 90000]);
    expect(job.years_experience_required).toBe(8);
    expect(job.title).toBe("Technical Program Manager");
  });

  it("reads common salary formats", () => {
    expect(salariesFromText("€70k – €85k")).toEqual([70000, 85000]);
    expect(salariesFromText("70.000€ a 80.000€")).toEqual([70000, 80000]);
    expect(salariesFromText("EUR 95,000")).toEqual([95000]);
    expect(salariesFromText("5 days")).toEqual([]);
  });

  it("returns schema-valid output through the provider interface", async () => {
    const provider = new DemoProvider();
    const out = await provider.generate({
      task: "resume_parser", system: "", prompt: "", schema: parsedResumeSchema, input: { text: text("sample-cv.txt") },
    });
    expect(provider.isDemo).toBe(true);
    expect(out.current_role).toBe("Engineering Manager");
  });
});
