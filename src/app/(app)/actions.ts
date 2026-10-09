"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { destroySession, getCurrentUser } from "@/lib/auth/session";
import { AIError, getAIProvider } from "@/lib/ai";
import { parsedResumeSchema } from "@/lib/ai/schemas";
import { CvFileError, detectCvKind, extractCvText, mimeFor } from "@/lib/cv/extract";
import { parseResume } from "@/lib/services/resumeParser";
import { parseJob } from "@/lib/services/jobParser";
import { matchJob } from "@/lib/services/jobMatcher";
import { profileFormSchema, profileSeedFromResume, toMatchProfile } from "@/lib/services/profile";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

async function userOrRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function aiErrorMessage(error: unknown): string {
  if (error instanceof AIError) {
    console.error(`[ai] ${error.message}`);
    return error.userMessage;
  }
  throw error;
}

// ---------- CV upload ----------

export async function uploadCv(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or DOCX file to upload." };

  let text: string;
  let kind;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    kind = detectCvKind(bytes, file.name);
    text = await extractCvText(bytes, kind);
  } catch (error) {
    if (error instanceof CvFileError) return { error: error.message };
    throw error;
  }

  const provider = getAIProvider();
  let parsed;
  try {
    parsed = await parseResume(provider, text, user.language);
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }

  const existing = await db.careerProfile.findUnique({ where: { userId: user.id } });
  const seed = profileSeedFromResume(parsed, existing);
  await db.$transaction([
    db.resume.create({
      data: {
        userId: user.id,
        fileName: file.name.slice(0, 200),
        mimeType: mimeFor(kind),
        fileSize: file.size,
        extractedText: text,
        parsedProfile: parsed as unknown as Prisma.InputJsonValue,
        aiProvider: provider.name,
      },
    }),
    db.careerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...seed },
      update: seed,
    }),
  ]);
  redirect("/onboarding/profile");
}

// ---------- Career profile ----------

const PROFILE_KEYS = [
  "currentRole", "targetRoles", "seniority", "yearsExperience", "location", "remotePreference", "countries",
  "salaryTarget", "salaryMinimum", "skills", "industries", "preferredCompanySize", "linkedinUrl", "careerGoal",
] as const;

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  const raw = Object.fromEntries(PROFILE_KEYS.map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = profileFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, values: raw, error: "Check the highlighted fields." };
  }
  const data = { ...parsed.data, confirmedAt: new Date() };
  await db.careerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  revalidatePath("/", "layout");
  redirect(String(formData.get("next") ?? "") === "onboarding" ? "/jobs/new?welcome=1" : "/profile?saved=1");
}

// ---------- Job analysis ----------

export async function analyzeJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  const values = {
    description: String(formData.get("description") ?? ""),
    company: String(formData.get("company") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
  };
  const description = values.description.trim();
  if (description.length < 200) {
    return { fieldErrors: { description: "Paste the full job description (at least a few paragraphs)." }, values };
  }
  if (description.length > 30000) {
    return { fieldErrors: { description: "This is longer than a job description usually is. Paste just the posting." }, values };
  }
  if (values.url && !/^https?:\/\/\S+$/i.test(values.url)) {
    return { fieldErrors: { url: "Enter a full link starting with https://" }, values };
  }

  const profile = await db.careerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/onboarding/cv");
  const resume = await db.resume.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const parsedResume = resume?.parsedProfile ? parsedResumeSchema.safeParse(resume.parsedProfile) : null;

  const provider = getAIProvider();
  let job, result;
  try {
    job = await parseJob(provider, description, user.language);
    result = await matchJob(
      provider,
      {
        profile: toMatchProfile(profile),
        resume: parsedResume?.success ? parsedResume.data : null,
        resumeText: resume?.extractedText ?? null,
        job,
        jobDescription: description,
      },
      user.language,
    );
  } catch (error) {
    return { error: aiErrorMessage(error), values };
  }

  const salaryText =
    job.salary_min_eur || job.salary_max_eur
      ? [job.salary_min_eur, job.salary_max_eur].filter(Boolean).map((n) => `€${Math.round(n! / 1000)}k`).join("–")
      : job.salary_text;

  const saved = await db.job.create({
    data: {
      userId: user.id,
      company: values.company || job.company,
      title: values.title || job.title,
      url: values.url || null,
      description,
      salary: salaryText,
      location: job.location,
      parsedJob: job as unknown as Prisma.InputJsonValue,
      analyses: {
        create: {
          resumeId: resume?.id,
          matchScore: result.matchScore,
          breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
          strengths: result.strengths as unknown as Prisma.InputJsonValue,
          gaps: result.gaps as unknown as Prisma.InputJsonValue,
          risks: result.risks as unknown as Prisma.InputJsonValue,
          recommendation: result.recommendation,
          reasoning: result.reasoning,
          aiProvider: provider.name,
        },
      },
    },
  });
  redirect(`/jobs/${saved.id}`);
}

// ---------- Privacy ----------

export async function deleteResumes(): Promise<void> {
  const user = await userOrRedirect();
  await db.resume.deleteMany({ where: { userId: user.id } });
  revalidatePath("/", "layout");
  redirect("/settings?cvDeleted=1");
}

export async function deleteAccount(formData: FormData): Promise<void> {
  const user = await userOrRedirect();
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== user.email.toLowerCase()) {
    redirect("/settings?confirmError=1");
  }
  // Cascades remove sessions, profile, CVs, jobs and analyses.
  await destroySession();
  await db.user.delete({ where: { id: user.id } });
  redirect("/?deleted=1");
}
