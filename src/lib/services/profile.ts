import type { CareerProfile } from "@prisma/client";
import { z } from "zod/v4";
import type { ParsedResume } from "@/lib/ai/schemas";
import type { MatchProfile } from "./jobMatcher";

/** Fields seeded from a parsed CV. Never overwrites what the user already confirmed. */
export function profileSeedFromResume(parsed: ParsedResume, existing: CareerProfile | null) {
  const keep = <T,>(current: T | null | undefined, next: T) =>
    existing?.confirmedAt && current != null && !(Array.isArray(current) && current.length === 0) ? current : next;
  return {
    currentRole: keep(existing?.currentRole, parsed.current_role),
    targetRoles: keep(existing?.targetRoles, parsed.suggested_target_roles),
    seniority: keep(existing?.seniority, parsed.seniority === "unknown" ? null : parsed.seniority),
    yearsExperience: keep(existing?.yearsExperience, parsed.years_experience),
    location: keep(existing?.location, parsed.location),
    skills: keep(existing?.skills, parsed.skills),
    industries: keep(existing?.industries, parsed.industries),
  };
}

const list = z
  .string()
  .transform((s) => [...new Set(s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 40));
const optionalText = (max: number) =>
  z.string().trim().max(max).transform((s) => (s === "" ? null : s));
const optionalInt = (max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((s) => s.replace(/[€\s.,]/g, "").replace(/k$/i, "000"))
    .refine((s) => s === "" || (/^\d+$/.test(s) && Number(s) <= max), message)
    .transform((s) => (s === "" ? null : Number(s)));

export const profileFormSchema = z
  .object({
    currentRole: optionalText(120),
    targetRoles: list,
    seniority: z.enum(["", "junior", "mid", "senior", "lead", "principal", "executive"]).transform((s) => (s === "" ? null : s)),
    yearsExperience: optionalInt(60, "Enter a number of years up to 60"),
    location: optionalText(120),
    remotePreference: z.enum(["", "remote", "hybrid", "onsite", "flexible"]).transform((s) => (s === "" ? null : s)),
    countries: list,
    salaryTarget: optionalInt(2_000_000, "Enter an annual amount in euros"),
    salaryMinimum: optionalInt(2_000_000, "Enter an annual amount in euros"),
    skills: list,
    industries: list,
    preferredCompanySize: optionalText(60),
    linkedinUrl: optionalText(300).pipe(
      z.union([z.null(), z.string().regex(/^https:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\//i, "Use a linkedin.com URL")]),
    ),
    careerGoal: optionalText(500),
  })
  .refine((p) => p.salaryMinimum == null || p.salaryTarget == null || p.salaryMinimum <= p.salaryTarget, {
    path: ["salaryMinimum"],
    message: "Your minimum should not be above your target",
  })
  .refine((p) => p.targetRoles.length > 0, { path: ["targetRoles"], message: "Add at least one target role" });

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

const COMPLETENESS_FIELDS: (keyof CareerProfile)[] = [
  "currentRole", "targetRoles", "seniority", "yearsExperience", "location", "remotePreference",
  "countries", "salaryTarget", "salaryMinimum", "skills", "industries", "careerGoal",
];

export function profileCompleteness(profile: CareerProfile | null, hasResume: boolean): number {
  if (!profile) return hasResume ? 10 : 0;
  const filled = COMPLETENESS_FIELDS.filter((k) => {
    const v = profile[k];
    return Array.isArray(v) ? v.length > 0 : v != null && v !== "";
  }).length;
  const total = COMPLETENESS_FIELDS.length + 1;
  return Math.round(((filled + (hasResume ? 1 : 0)) / total) * 100);
}

export function toMatchProfile(p: CareerProfile): MatchProfile {
  return {
    currentRole: p.currentRole,
    targetRoles: p.targetRoles,
    seniority: p.seniority,
    yearsExperience: p.yearsExperience,
    skills: p.skills,
    industries: p.industries,
    careerGoal: p.careerGoal,
    remotePreference: p.remotePreference,
    countries: p.countries,
    location: p.location,
    salaryTarget: p.salaryTarget,
    salaryMinimum: p.salaryMinimum,
  };
}
