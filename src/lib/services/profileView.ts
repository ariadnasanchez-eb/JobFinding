import type { CareerProfile } from "@prisma/client";
import type { ProfileFormDefaults } from "@/components/ProfileForm";

export function profileFormDefaults(p: CareerProfile | null): ProfileFormDefaults {
  const s = (v: string | number | null | undefined) => (v == null ? "" : String(v));
  return {
    currentRole: s(p?.currentRole),
    targetRoles: (p?.targetRoles ?? []).join(", "),
    seniority: s(p?.seniority),
    yearsExperience: s(p?.yearsExperience),
    location: s(p?.location),
    remotePreference: s(p?.remotePreference),
    countries: (p?.countries ?? []).join(", "),
    salaryTarget: s(p?.salaryTarget),
    salaryMinimum: s(p?.salaryMinimum),
    skills: (p?.skills ?? []).join(", "),
    industries: (p?.industries ?? []).join(", "),
    preferredCompanySize: s(p?.preferredCompanySize),
    linkedinUrl: s(p?.linkedinUrl),
    careerGoal: s(p?.careerGoal),
  };
}
