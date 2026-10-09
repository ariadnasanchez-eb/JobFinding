import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { profileCompleteness } from "@/lib/services/profile";
import { RECOMMENDATION_LABEL, scoreTone } from "@/lib/services/analysisView";

export const metadata = { title: "Dashboard · AI Career Coach" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [profile, resumeCount, jobs] = await Promise.all([
    db.careerProfile.findUnique({ where: { userId: user.id } }),
    db.resume.count({ where: { userId: user.id } }),
    db.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { analyses: { orderBy: { createdAt: "desc" }, take: 1, select: { matchScore: true, recommendation: true, aiProvider: true } } },
    }),
  ]);
  if (!profile && resumeCount === 0) redirect("/onboarding/cv");

  const completeness = profileCompleteness(profile, resumeCount > 0);
  const scored = jobs.flatMap((j) => j.analyses);
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + a.matchScore, 0) / scored.length) : null;
  const worthApplying = scored.filter((a) => a.recommendation === "STRONGLY_APPLY" || a.recommendation === "APPLY").length;

  const actions: { label: string; href: string }[] = [];
  if (!profile?.confirmedAt) actions.push({ label: "Review your career profile", href: "/onboarding/profile" });
  if (profile?.confirmedAt && completeness < 100) actions.push({ label: "Complete your profile so matches are more accurate", href: "/profile" });
  if (jobs.length === 0) actions.push({ label: "Analyze your first job", href: "/jobs/new" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-muted">Your career command center.</p>
        </div>
        <ButtonLink href="/jobs/new">Analyze a job</ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Career profile</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{completeness}%</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-accent" style={{ width: `${completeness}%` }} />
          </div>
          <Link href="/profile" className="mt-3 inline-block text-xs font-medium text-accent">Edit profile</Link>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Jobs analyzed</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{jobs.length}</p>
          <p className="mt-3 text-xs text-muted">{worthApplying} worth applying to</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Average match</p>
          <p className={`mt-2 text-3xl font-semibold tabular-nums ${avg != null ? scoreTone(avg) : ""}`}>{avg != null ? `${avg}%` : "–"}</p>
          <p className="mt-3 text-xs text-muted">Across analyzed jobs</p>
        </Card>
      </div>

      {actions.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold">Recommended next steps</h2>
          <ol className="mt-3 space-y-2">
            {actions.map((a, i) => (
              <li key={a.href} className="text-sm">
                <Link href={a.href} className="text-accent hover:underline">{i + 1}. {a.label}</Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="p-0">
        <h2 className="px-6 pt-6 text-sm font-semibold">Analyzed jobs</h2>
        {jobs.length === 0 ? (
          <p className="px-6 pb-6 pt-3 text-sm text-muted">Nothing yet. Paste a job description to get your first match report.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {jobs.map((job) => {
              const a = job.analyses[0];
              return (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-canvas">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{[job.title, job.company].filter(Boolean).join(" · ") || "Untitled job"}</p>
                      <p className="text-xs text-muted">{job.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    {a && (
                      <div className="flex items-center gap-3">
                        {a.aiProvider === "demo" && <Badge className="bg-amber-100 text-amber-900">Demo</Badge>}
                        <Badge className={RECOMMENDATION_LABEL[a.recommendation].className}>{RECOMMENDATION_LABEL[a.recommendation].label}</Badge>
                        <span className={`w-12 text-right font-semibold tabular-nums ${scoreTone(a.matchScore)}`}>{a.matchScore}%</span>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
