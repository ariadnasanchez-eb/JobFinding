import type { ParsedJob } from "@/lib/ai/schemas";

export type RemotePref = "remote" | "hybrid" | "onsite" | "flexible";

export interface ProfileFacts {
  remotePreference: RemotePref | null;
  countries: string[];
  location: string | null;
  salaryTarget: number | null;
  salaryMinimum: number | null;
}

export interface Risk {
  risk: string;
  severity: "high" | "medium" | "low";
}

export interface LocationFit {
  score: number;
  rationale: string;
  risks: Risk[];
}

export type SalaryStatus = "unknown" | "compatible" | "concern";

export interface SalaryFit {
  status: SalaryStatus;
  rationale: string;
  risks: Risk[];
}

export const clampScore = (n: number): number => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

const WILDCARD_REGIONS = ["europe", "eu", "emea", "worldwide", "anywhere", "global"];

function countryOverlap(allowed: string[], mine: string[]): boolean {
  const a = allowed.map((c) => c.trim().toLowerCase());
  if (a.some((c) => WILDCARD_REGIONS.includes(c))) return true;
  const m = mine.map((c) => c.trim().toLowerCase());
  return a.some((c) => m.some((x) => x === c || x.includes(c) || c.includes(x)));
}

/** Deterministic location fit: work mode vs. preference, and where the job can be done from. */
export function assessLocation(profile: ProfileFacts, job: ParsedJob): LocationFit {
  const risks: Risk[] = [];
  const pref = profile.remotePreference;
  const mode = job.work_mode;
  const days = job.onsite_days_per_week;
  let score: number;
  let rationale: string;

  if (!pref) {
    score = 70;
    rationale = "Set a remote/hybrid/onsite preference in your profile to score location.";
  } else if (pref === "flexible" || pref === "onsite") {
    score = 100;
    rationale = `You are open to ${pref === "flexible" ? "any work mode" : "onsite work"}.`;
  } else if (mode === "unknown") {
    score = 70;
    rationale = "The job does not say whether it is remote, hybrid or onsite.";
    risks.push({ risk: "Work mode is not stated in the job description. Confirm it with the recruiter.", severity: "low" });
  } else if (mode === "remote") {
    score = 100;
    rationale = "The role is remote.";
  } else if (pref === "remote") {
    if (mode === "hybrid") {
      score = 50;
      rationale = `You want fully remote; the role is hybrid${days ? ` (${days} days onsite per week)` : ""}.`;
      risks.push({ risk: `Role is hybrid${days ? ` with ${days} days onsite per week` : ""}; you want fully remote.`, severity: "medium" });
    } else {
      score = 15;
      rationale = "You want fully remote; the role is onsite.";
      risks.push({ risk: `Role is onsite${days ? ` ${days} days a week` : ""}; you want fully remote.`, severity: "high" });
    }
  } else {
    // pref === "hybrid"
    if (mode === "hybrid") {
      score = days != null && days >= 4 ? 70 : 100;
      rationale = days != null && days >= 4 ? `Hybrid, but ${days} days onsite is close to full-time office.` : "The role is hybrid, like you prefer.";
      if (days != null && days >= 4) risks.push({ risk: `Hybrid role with ${days} days onsite per week.`, severity: "low" });
    } else {
      score = 50;
      rationale = "You prefer hybrid; the role is fully onsite.";
      risks.push({ risk: "Role is fully onsite; you prefer hybrid.", severity: "medium" });
    }
  }

  if (job.countries_allowed.length > 0 && profile.countries.length > 0 && !countryOverlap(job.countries_allowed, profile.countries)) {
    score = Math.min(score, 30);
    rationale += ` The job is limited to ${job.countries_allowed.join(", ")}, which is not in your work countries.`;
    risks.push({ risk: `Job only hires in ${job.countries_allowed.join(", ")}; your work countries are ${profile.countries.join(", ")}.`, severity: "high" });
  }

  return { score: clampScore(score), rationale, risks };
}

const eur = (n: number) => `€${Math.round(n / 1000)}k`;

/** Deterministic salary check against the user's target and minimum. */
export function assessSalary(profile: ProfileFacts, job: ParsedJob): SalaryFit {
  const top = job.salary_max_eur ?? job.salary_min_eur;
  if (top == null) {
    return { status: "unknown", rationale: "The job does not publish a salary.", risks: [] };
  }
  const range = job.salary_min_eur && job.salary_max_eur && job.salary_min_eur !== job.salary_max_eur
    ? `${eur(job.salary_min_eur)}–${eur(job.salary_max_eur)}`
    : eur(top);
  if (profile.salaryMinimum == null && profile.salaryTarget == null) {
    return { status: "unknown", rationale: `The job pays ${range}. Add your salary target to compare.`, risks: [] };
  }
  if (profile.salaryMinimum != null && top < profile.salaryMinimum) {
    return {
      status: "concern",
      rationale: `The job pays up to ${eur(top)}, below your minimum of ${eur(profile.salaryMinimum)}.`,
      risks: [{ risk: `Salary (${range}) is below your minimum of ${eur(profile.salaryMinimum)}.`, severity: "high" }],
    };
  }
  if (profile.salaryTarget != null && top < profile.salaryTarget) {
    return {
      status: "concern",
      rationale: `The job pays up to ${eur(top)}, below your target of ${eur(profile.salaryTarget)}.`,
      risks: [{ risk: `Salary (${range}) is below your target of ${eur(profile.salaryTarget)}.`, severity: "medium" }],
    };
  }
  return { status: "compatible", rationale: `The job pays ${range}, in line with your expectations.`, risks: [] };
}

export const WEIGHTS = { experience: 0.3, skills: 0.3, seniority: 0.15, industry: 0.1, location: 0.15 } as const;

export function overallScore(scores: Record<keyof typeof WEIGHTS, number>): number {
  let total = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    total += clampScore(scores[key]) * WEIGHTS[key];
  }
  return clampScore(total);
}
