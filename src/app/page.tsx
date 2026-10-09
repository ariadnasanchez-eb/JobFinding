import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth/session";

const STEPS = [
  {
    title: "Analyze your career",
    body: "Upload your CV. We extract your experience, skills, seniority and measurable achievements into a profile you can review and correct.",
  },
  {
    title: "Find your best-fit jobs",
    body: "Paste any job description. Get a match score, the strengths that make you credible, the gaps that could cost you, and a clear apply or skip verdict.",
  },
  {
    title: "Tailor your CV",
    body: "Reorder and rephrase your real experience for a specific role. Nothing invented: no fake metrics, no fake technologies.",
    soon: true,
  },
  {
    title: "Prepare for interviews",
    body: "Likely questions for the role, STAR stories drawn from your own experience, and a mock interview with feedback.",
    soon: true,
  },
  {
    title: "Track your progress",
    body: "Keep every application, interview and offer in one place and see which roles convert.",
    soon: true,
  },
];

export default async function Landing() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <ButtonLink href="/dashboard" variant="secondary">Open dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">Log in</ButtonLink>
              <ButtonLink href="/signup">Analyze my career</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="mb-4 text-sm font-medium text-accent">A decision engine for your career</p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Stop applying blindly. Start applying strategically.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Your AI career coach analyzes your experience against real opportunities, tells you which jobs are worth
            your time, and helps you prepare to win them.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href={user ? "/jobs/new" : "/signup"} className="px-6 py-3 text-base">
              Analyze my career
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary" className="px-6 py-3 text-base">
              See how it works
            </ButtonLink>
          </div>
          <p className="mt-6 text-xs text-muted">Built for experienced tech professionals in Spain and Europe.</p>
        </section>

        <section className="border-y border-line bg-canvas">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted">
              The question we answer first
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-2xl font-medium leading-snug text-ink">
              &ldquo;Should I spend my time applying to this job?&rdquo;
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
              Before rewriting anything, you get an evidence-based verdict that separates what your CV shows, what the
              job asks for, and what is our recommendation.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-8 px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">How it works</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-line bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
                  {step.soon && <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">Coming soon</span>}
                </div>
                <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-24 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Your CV stays yours</h2>
          <p className="mt-3 text-muted">
            Your documents are private to your account, never used to answer anyone else, and you can delete them at any
            time. We strip contact details before anything is sent to the AI.
          </p>
          <div className="mt-8">
            <ButtonLink href={user ? "/jobs/new" : "/signup"} className="px-6 py-3 text-base">Analyze my career</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-xs text-muted">AI Career Coach</footer>
    </div>
  );
}
