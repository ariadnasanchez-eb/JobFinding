"use client";

import { useActionState } from "react";
import { saveProfile, type FormState } from "@/app/(app)/actions";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export interface ProfileFormDefaults {
  currentRole: string;
  targetRoles: string;
  seniority: string;
  yearsExperience: string;
  location: string;
  remotePreference: string;
  countries: string;
  salaryTarget: string;
  salaryMinimum: string;
  skills: string;
  industries: string;
  preferredCompanySize: string;
  linkedinUrl: string;
  careerGoal: string;
}

export function ProfileForm({ defaults, mode }: { defaults: ProfileFormDefaults; mode: "onboarding" | "edit" }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, {});
  const v = (k: keyof ProfileFormDefaults) => state.values?.[k] ?? defaults[k];
  const fe = state.fieldErrors ?? {};
  // Re-mount inputs when the server returns values so defaultValue reflects them.
  const key = state.values ? JSON.stringify(state.values).length : 0;

  return (
    <form action={action} className="space-y-8" key={key} noValidate>
      <input type="hidden" name="next" value={mode} />
      {state.error && <Alert>{state.error}</Alert>}

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold text-ink">Where you are</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current role" error={fe.currentRole}>
            <input name="currentRole" defaultValue={v("currentRole")} className={inputClass} placeholder="Engineering Manager" />
          </Field>
          <Field label="Years of experience" error={fe.yearsExperience}>
            <input name="yearsExperience" inputMode="numeric" defaultValue={v("yearsExperience")} className={inputClass} />
          </Field>
          <Field label="Seniority" error={fe.seniority}>
            <select name="seniority" defaultValue={v("seniority")} className={inputClass}>
              <option value="">Not set</option>
              {["junior", "mid", "senior", "lead", "principal", "executive"].map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field label="Location" error={fe.location}>
            <input name="location" defaultValue={v("location")} className={inputClass} placeholder="Barcelona, Spain" />
          </Field>
        </div>
        <Field label="Skills" hint="Comma-separated." error={fe.skills}>
          <textarea name="skills" rows={3} defaultValue={v("skills")} className={inputClass} />
        </Field>
        <Field label="Industries" hint="Comma-separated." error={fe.industries}>
          <input name="industries" defaultValue={v("industries")} className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold text-ink">Where you want to go</legend>
        <Field label="Target roles" hint="Comma-separated, e.g. Product Manager, Technical Program Manager." error={fe.targetRoles}>
          <input name="targetRoles" defaultValue={v("targetRoles")} className={inputClass} />
        </Field>
        <Field label="Short-term career goal" error={fe.careerGoal}>
          <textarea name="careerGoal" rows={2} defaultValue={v("careerGoal")} className={inputClass} placeholder="Move from Engineering Management into Product within 12 months" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Work mode" error={fe.remotePreference}>
            <select name="remotePreference" defaultValue={v("remotePreference")} className={inputClass}>
              <option value="">Not set</option>
              <option value="remote">Fully remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
              <option value="flexible">Flexible</option>
            </select>
          </Field>
          <Field label="Countries you can work in" hint="Comma-separated." error={fe.countries}>
            <input name="countries" defaultValue={v("countries")} className={inputClass} placeholder="Spain, Portugal" />
          </Field>
          <Field label="Target salary (€ / year, gross)" error={fe.salaryTarget}>
            <input name="salaryTarget" inputMode="numeric" defaultValue={v("salaryTarget")} className={inputClass} placeholder="85000" />
          </Field>
          <Field label="Minimum acceptable salary (€ / year)" error={fe.salaryMinimum}>
            <input name="salaryMinimum" inputMode="numeric" defaultValue={v("salaryMinimum")} className={inputClass} placeholder="70000" />
          </Field>
          <Field label="Preferred company size" error={fe.preferredCompanySize}>
            <select name="preferredCompanySize" defaultValue={v("preferredCompanySize")} className={inputClass}>
              <option value="">No preference</option>
              <option value="startup">Startup (1–50)</option>
              <option value="scaleup">Scale-up (50–500)</option>
              <option value="enterprise">Enterprise (500+)</option>
            </select>
          </Field>
          <Field label="LinkedIn URL (optional)" error={fe.linkedinUrl}>
            <input name="linkedinUrl" type="url" defaultValue={v("linkedinUrl")} className={inputClass} placeholder="https://www.linkedin.com/in/…" />
          </Field>
        </div>
      </fieldset>

      <div className="flex items-center gap-3 border-t border-line pt-6">
        <SubmitButton pendingText="Saving…">{mode === "onboarding" ? "Confirm profile and continue" : "Save profile"}</SubmitButton>
      </div>
    </form>
  );
}
