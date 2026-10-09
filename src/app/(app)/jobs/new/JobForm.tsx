"use client";

import { useActionState } from "react";
import { analyzeJob, type FormState } from "../../actions";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function JobForm() {
  const [state, action] = useActionState<FormState, FormData>(analyzeJob, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-5" key={JSON.stringify(v).length} noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Job description" hint="Paste the full posting: responsibilities, requirements, location and salary if listed." error={fe.description}>
        <textarea name="description" rows={14} required defaultValue={v.description} className={`${inputClass} font-mono text-[13px] leading-relaxed`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Company (optional)" error={fe.company}>
          <input name="company" defaultValue={v.company} className={inputClass} />
        </Field>
        <Field label="Job title (optional)" error={fe.title}>
          <input name="title" defaultValue={v.title} className={inputClass} />
        </Field>
        <Field label="Job URL (optional)" error={fe.url}>
          <input name="url" type="url" defaultValue={v.url} className={inputClass} placeholder="https://" />
        </Field>
      </div>
      <SubmitButton pendingText="Analyzing the match… this can take up to a minute">Analyze match</SubmitButton>
    </form>
  );
}
