const STEPS = ["Upload CV", "Review profile", "Analyze a job"];

export function OnboardingSteps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`grid h-6 w-6 place-items-center rounded-full font-semibold ${
              i < current ? "bg-accent text-white" : i === current ? "border-2 border-accent text-accent" : "border border-line text-muted"
            }`}
          >
            {i + 1}
          </span>
          <span className={i === current ? "font-medium text-ink" : "text-muted"}>{label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
