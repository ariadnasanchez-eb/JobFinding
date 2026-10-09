"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthState } from "../actions";
import { Alert, Card, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(login, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Card>
      <h1 className="text-xl font-semibold">Log in</h1>
      <form action={action} className="mt-6 space-y-4" noValidate>
        {state.error && <Alert>{state.error}</Alert>}
        <Field label="Email" error={fe.email}>
          <input name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} className={inputClass} />
        </Field>
        <Field label="Password" error={fe.password}>
          <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        <div className="pt-2">
          <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
        </div>
      </form>
      <p className="mt-6 text-sm text-muted">
        New here? <Link href="/signup" className="font-medium text-accent">Create an account</Link>
      </p>
    </Card>
  );
}
