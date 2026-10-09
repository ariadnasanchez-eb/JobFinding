import { z } from "zod/v4";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(200, "Password is too long"),
  language: z.enum(["en", "es"]).default("en"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type SignupInput = z.infer<typeof signupSchema>;
