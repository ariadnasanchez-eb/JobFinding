import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ProfileForm } from "@/components/ProfileForm";
import { CvInsights } from "@/components/CvInsights";
import { Alert, ButtonLink, Card } from "@/components/ui";
import { profileFormDefaults } from "@/lib/services/profileView";
import { latestResume } from "@/lib/services/latestResume";

export const metadata = { title: "Career profile · AI Career Coach" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const { saved } = await searchParams;
  const [profile, resume] = await Promise.all([
    db.careerProfile.findUnique({ where: { userId: user.id } }),
    latestResume(user.id),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Career profile</h1>
          <p className="mt-1 text-muted">Every job analysis uses this profile and your latest CV.</p>
        </div>
        <ButtonLink href="/onboarding/cv" variant="secondary">{resume ? "Upload a new CV" : "Upload your CV"}</ButtonLink>
      </div>
      {saved && <div className="mt-6"><Alert tone="info">Profile saved.</Alert></div>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <ProfileForm defaults={profileFormDefaults(profile)} mode="edit" />
        </Card>
        <aside className="space-y-4">
          {resume?.parsed ? (
            <CvInsights parsed={resume.parsed} fileName={resume.fileName} demo={resume.aiProvider === "demo"} />
          ) : (
            <Card>
              <p className="text-sm text-muted">
                No CV on file. <Link href="/onboarding/cv" className="font-medium text-accent">Upload one</Link> so job
                analyses can cite your real experience.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
