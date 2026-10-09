import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { RECOMMENDATION_LABEL, scoreTone, storedAnalysisSchema } from "@/lib/services/analysisView";

export const metadata = { title: "Match report · AI Career Coach" };

const SEVERITY = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-slate-100 text-slate-700",
} as const;

const SALARY_LABEL = { unknown: "Unknown", compatible: "Compatible", concern: "Concern" } as const;

export default async function JobReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  // Scoped by userId: another user's job id returns 404, not their data.
  const job = await db.job.findFirst({
    where: { id, userId: user.id },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!job) notFound();
  const row = job.analyses[0];
  const parsed = row ? storedAnalysisSchema.safeParse(row) : null;

  const heading = [job.title, job.company].filter(Boolean).join(" · ") || "Untitled job";

  if (!row || !parsed?.success) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <Alert>This analysis could not be displayed. Run it again from the job description.</Alert>
        <ButtonLink href="/jobs/new">Analyze a job</ButtonLink>
      </div>
    );
  }
  const a = parsed.data;
  const demo = row.aiProvider === "demo";
  const rec = RECOMMENDATION_LABEL[a.recommendation];
  const dims = [
    ["Experience", a.breakdown.experience],
    ["Skills", a.breakdown.skills],
    ["Seniority", a.breakdown.seniority],
    ["Industry", a.breakdown.industry],
    ["Location", a.breakdown.location],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Match report</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted">
            {[job.location, job.salary].filter(Boolean).join(" · ")}
            {job.url && (
              <>
                {" · "}
                <a href={job.url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent">View posting</a>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {demo && <Badge className="bg-amber-100 text-amber-900">Demo data</Badge>}
          <ButtonLink href="/jobs/new" variant="secondary">Analyze another job</ButtonLink>
        </div>
      </div>

      <Card className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-start justify-center border-line md:border-r md:pr-6">
          <span className={`text-5xl font-semibold tracking-tight ${scoreTone(a.matchScore)}`} data-testid="match-score">
            {a.matchScore}%
          </span>
          <span className="mt-1 text-sm font-medium uppercase tracking-wider text-muted">Match</span>
          <Badge className={`mt-4 px-3 py-1 text-sm ${rec.className}`}>{rec.label}</Badge>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Recommendation</h2>
          <p className="mt-2 leading-relaxed text-ink" data-testid="reasoning">{a.reasoning}</p>
          <p className="mt-3 text-xs text-muted">
            {demo ? "Demo heuristic based on keyword overlap, not an AI assessment." : "AI recommendation, based on your profile, your CV and this job description."}
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Breakdown</h2>
        <dl className="mt-4 divide-y divide-line">
          {dims.map(([label, d]) => (
            <div key={label} className="grid gap-2 py-3 sm:grid-cols-[140px_180px_1fr] sm:items-center">
              <dt className="text-sm font-medium">{label}</dt>
              <dd className="flex items-center gap-3">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${d.score}%` }} />
                </span>
                <span className={`w-10 text-right text-sm font-semibold tabular-nums ${scoreTone(d.score)}`}>{d.score}%</span>
              </dd>
              <dd className="text-sm text-muted">{d.rationale}</dd>
            </div>
          ))}
          <div className="grid gap-2 py-3 sm:grid-cols-[140px_180px_1fr] sm:items-center">
            <dt className="text-sm font-medium">Salary</dt>
            <dd className="text-sm font-semibold">{SALARY_LABEL[a.breakdown.salary.status]}</dd>
            <dd className="text-sm text-muted">{a.breakdown.salary.rationale}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          Location and salary are calculated from your stated preferences; the other scores are {demo ? "demo heuristics" : "AI assessments"}.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold">Strong matches</h2>
          {a.strengths.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No clear matches found.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {a.strengths.map((s, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-600" aria-hidden>✓</span>
                    <div>
                      <p className="font-medium">{s.point}</p>
                      <p className="mt-0.5 text-muted">
                        {s.evidence} <span className="text-xs">(from your {s.source === "cv" ? "CV" : "profile"})</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Gaps</h2>
          {a.gaps.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No important gaps found.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {a.gaps.map((g, i) => (
                <li key={i} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{g.requirement}</p>
                    <Badge className={g.importance === "must_have" ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-700"}>
                      {g.importance === "must_have" ? "Required" : "Nice to have"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-muted">{g.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-semibold">Risk factors</h2>
        {a.risks.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No risk factors found.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {a.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Badge className={`mt-0.5 ${SEVERITY[r.severity]}`}>{r.severity}</Badge>
                <span>{r.risk}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <details className="rounded-xl border border-line bg-white p-6">
        <summary className="cursor-pointer text-sm font-semibold">Job description you pasted</summary>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">{job.description}</pre>
      </details>
    </div>
  );
}
