import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getAIProvider } from "@/lib/ai";
import { logout } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const demo = getAIProvider().isDemo;
  return (
    <div className="min-h-screen">
      {demo && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Demo mode: no AI is connected. Scores and extractions come from keyword heuristics and are labelled as demo data.
        </div>
      )}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo href="/dashboard" />
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/dashboard" className="rounded-md px-3 py-2 text-muted hover:text-ink">Dashboard</Link>
            <Link href="/profile" className="rounded-md px-3 py-2 text-muted hover:text-ink">Profile</Link>
            <Link href="/settings" className="rounded-md px-3 py-2 text-muted hover:text-ink">Settings</Link>
            <form action={logout}>
              <button className="rounded-md px-3 py-2 text-muted hover:text-ink">Log out</button>
            </form>
            <ButtonLink href="/jobs/new" className="ml-2">Analyze a job</ButtonLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <span className="sr-only">Signed in as {user.email}</span>
    </div>
  );
}
