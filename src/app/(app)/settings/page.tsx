import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Alert, Card, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteAccount, deleteResumes } from "../actions";

export const metadata = { title: "Settings · AI Career Coach" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ cvDeleted?: string; confirmError?: string }> }) {
  const user = await requireUser();
  const { cvDeleted, confirmError } = await searchParams;
  const resumes = await db.resume.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, createdAt: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <h2 className="text-sm font-semibold">Account</h2>
        <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Name</dt><dd>{user.name}</dd>
          <dt className="text-muted">Email</dt><dd>{user.email}</dd>
          <dt className="text-muted">AI language</dt><dd>{user.language === "es" ? "Español" : "English"}</dd>
          <dt className="text-muted">Plan</dt><dd className="capitalize">{user.subscriptionStatus}</dd>
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Your CVs</h2>
        {cvDeleted && <div className="mt-3"><Alert tone="info">Your CVs and their extracted text were deleted.</Alert></div>}
        {resumes.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No CVs stored.</p>
        ) : (
          <>
            <ul className="mt-3 space-y-1 text-sm">
              {resumes.map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <span className="truncate">{r.fileName}</span>
                  <span className="shrink-0 text-muted">{r.createdAt.toLocaleDateString("en-GB")}</span>
                </li>
              ))}
            </ul>
            <form action={deleteResumes} className="mt-4">
              <SubmitButton variant="danger" pendingText="Deleting…">Delete all my CVs</SubmitButton>
            </form>
            <p className="mt-2 text-xs text-muted">Your career profile and past match reports are kept.</p>
          </>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-red-800">Delete account</h2>
        <p className="mt-2 text-sm text-muted">
          Permanently deletes your account, profile, CVs, jobs and match reports. This cannot be undone.
        </p>
        <form action={deleteAccount} className="mt-4 space-y-3">
          <Field label={`Type your email (${user.email}) to confirm`} error={confirmError ? "The email didn't match." : undefined}>
            <input name="confirm" autoComplete="off" className={inputClass} />
          </Field>
          <SubmitButton variant="danger" pendingText="Deleting…">Delete my account</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
