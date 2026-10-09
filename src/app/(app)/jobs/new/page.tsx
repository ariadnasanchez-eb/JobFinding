import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card } from "@/components/ui";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { JobForm } from "./JobForm";

export const metadata = { title: "Analyze a job · AI Career Coach" };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser();
  const profile = await db.careerProfile.findUnique({ where: { userId: user.id }, select: { confirmedAt: true } });
  if (!profile) redirect("/onboarding/cv");
  if (!profile.confirmedAt) redirect("/onboarding/profile");
  const { welcome } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      {welcome && <OnboardingSteps current={2} />}
      <h1 className="text-2xl font-semibold tracking-tight">{welcome ? "Analyze your first job" : "Analyze a job"}</h1>
      <p className="mt-2 text-muted">
        Paste a job you&apos;re considering. You&apos;ll get a match score, your strongest arguments, the gaps, the risks and a
        clear verdict on whether it&apos;s worth applying.
      </p>
      <Card className="mt-6">
        <JobForm />
      </Card>
    </div>
  );
}
