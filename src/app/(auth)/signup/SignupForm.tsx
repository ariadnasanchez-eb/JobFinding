"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthState } from "../actions";
import { Alert, Card, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function SignupForm() {
  const [state, action] = useActionState<AuthState, FormData>(signup, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Card>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Next you&apos;ll upload your CV. It takes about two minutes.</p>
      <form action={action} className="mt-6 space-y-4" noValidate>
        {state.error && <Alert>{state.error}</Alert>}
        <Field label="Name" error={fe.name}>
          <input name="name" autoComplete="name" required defaultValue={state.values?.name} className={inputClass} />
        </Field>
        <Field label="Email" error={fe.email}>
          <input name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} className={inputClass} />
        </Field>
        <Field label="Password" hint="At least 10 characters." error={fe.password}>
          <input name="password" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
        </Field>
        <Field label="Language for AI feedback" error={fe.language}>
          <select name="language" defaultValue={state.values?.language || "en"} className={inputClass}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </Field>
        <div className="pt-2">
          <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
        </div>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account? <Link href="/login" className="font-medium text-accent">Log in</Link>
      </p>
    </Card>
  );
}
