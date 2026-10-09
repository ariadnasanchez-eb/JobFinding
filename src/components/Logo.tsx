import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-xs text-white" aria-hidden>
        CC
      </span>
      AI Career Coach
    </Link>
  );
}
