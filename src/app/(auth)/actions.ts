"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema, signupSchema } from "@/lib/auth/validation";

export interface AuthState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function firstErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(["name", "email", "password", "language"].map((k) => [k, String(formData.get(k) ?? "")]));
  const values = { name: raw.name, email: raw.email, language: raw.language };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues), values };

  const { name, email, password, language } = parsed.data;
  let userId: string;
  try {
    const user = await db.user.create({
      data: { name, email, language, passwordHash: await hashPassword(password) },
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { fieldErrors: { email: "An account with this email already exists. Log in instead." }, values };
    }
    throw error;
  }
  await createSession(userId);
  redirect("/onboarding/cv");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues), values: { email: raw.email } };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Same message for unknown email and wrong password.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect.", values: { email: raw.email } };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
