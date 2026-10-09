import type { ParsedResume } from "@/lib/ai/schemas";
import { Badge, Card } from "./ui";

export function CvInsights({ parsed, fileName, demo }: { parsed: ParsedResume; fileName: string; demo: boolean }) {
  return (
    <Card className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Extracted from your CV</h2>
          {demo && <Badge className="bg-amber-100 text-amber-900">Demo data</Badge>}
        </div>
        <p className="mt-1 truncate text-xs text-muted">{fileName}</p>
      </div>
      {parsed.summary && <p className="text-sm leading-relaxed text-ink">{parsed.summary}</p>}
      {parsed.suggested_target_roles.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Roles you look credible for</h3>
          <p className="mt-1 text-xs text-muted">{demo ? "Demo heuristic based on role titles in your CV." : "AI recommendation based on your CV."}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parsed.suggested_target_roles.map((r) => (
              <Badge key={r} className="bg-accent/10 text-accent">{r}</Badge>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Measurable achievements found</h3>
        {parsed.achievements.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            None found. Achievements with numbers (%, €, users, team size) make your applications much stronger.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {parsed.achievements.slice(0, 6).map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>
                  {a.text}
                  {a.company && <span className="text-muted"> · {a.company}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
