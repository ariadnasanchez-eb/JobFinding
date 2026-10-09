import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-muted">This page doesn&apos;t exist or isn&apos;t yours to see.</p>
      <ButtonLink href="/dashboard" className="mt-6">Go to dashboard</ButtonLink>
    </div>
  );
}
