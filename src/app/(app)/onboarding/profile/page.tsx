import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { ProfileForm } from "@/components/ProfileForm";
import { CvInsights } from "@/components/CvInsights";
import { Card } from "@/components/ui";
import { profileFormDefaults } from "@/lib/services/profileView";
import { latestResume } from "@/lib/services/latestResume";

export const metadata = { title: "Review your profile · AI Career Coach" };

export default async function OnboardingProfilePage() {
  const user = await requireUser();
  const [profile, resume] = await Promise.all([
    db.careerProfile.findUnique({ where: { userId: user.id } }),
    latestResume(user.id),
  ]);
  if (!resume) redirect("/onboarding/cv");

  return (
    <div>
      <OnboardingSteps current={1} />
      <h1 className="text-2xl font-semibold tracking-tight">Review your career profile</h1>
      <p className="mt-2 max-w-2xl text-muted">
        We pre-filled this from your CV. Correct anything that&apos;s wrong and add your preferences: they decide how jobs are scored.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <ProfileForm defaults={profileFormDefaults(profile)} mode="onboarding" />
        </Card>
        <aside>
          {resume.parsed && <CvInsights parsed={resume.parsed} fileName={resume.fileName} demo={resume.aiProvider === "demo"} />}
        </aside>
      </div>
    </div>
  );
}
