import type { MatchAssessment, ParsedJob, ParsedResume } from "./schemas";
import { AIError, type AIProvider, type StructuredRequest } from "./provider";

/**
 * DEMO PROVIDER: keyword heuristics, no language model.
 *
 * Enabled only with AI_PROVIDER=demo so the flow can be run and tested without
 * an API key. Every screen that shows its output carries a "Demo data" label.
 */

const SKILLS = [
  "leadership", "people management", "hiring", "mentoring", "coaching", "agile", "scrum", "kanban",
  "product strategy", "product management", "roadmapping", "product discovery", "user research",
  "stakeholder management", "okrs", "program management", "project management", "delivery",
  "product analytics", "a/b testing", "sql", "data analysis", "python", "java", "javascript",
  "typescript", "react", "node.js", "go", "kotlin", "swift", "ruby", "php", "c#", ".net", "aws",
  "gcp", "azure", "kubernetes", "docker", "terraform", "microservices", "distributed systems",
  "system design", "architecture", "ci/cd", "devops", "machine learning", "llm", "payments",
  "fintech", "e-commerce", "saas", "b2b", "b2c", "marketplace", "jira", "figma", "budgeting",
  "communication", "english", "spanish", "catalan", "german", "french",
];

const ROLES = [
  "engineering manager", "software engineer", "senior software engineer", "staff engineer",
  "product manager", "senior product manager", "technical program manager", "program manager",
  "scrum master", "agile coach", "delivery manager", "product owner", "tech lead", "head of engineering",
  "director of engineering", "cto", "vp of engineering",
];

const INDUSTRIES = ["fintech", "e-commerce", "saas", "healthtech", "edtech", "travel", "marketplace", "gaming", "events", "ticketing", "insurance", "banking", "retail", "media"];

function findTerms(text: string, vocab: string[]): string[] {
  const lower = ` ${text.toLowerCase()} `;
  return vocab.filter((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(lower);
  });
}

function seniorityFromYears(years: number | null): ParsedResume["seniority"] {
  if (years == null) return "unknown";
  if (years < 2) return "junior";
  if (years < 5) return "mid";
  if (years < 9) return "senior";
  if (years < 14) return "lead";
  return "principal";
}

function yearsFromText(text: string): number | null {
  const explicit = text.match(/(\d{1,2})\+?\s*(?:years|años)/i);
  if (explicit) return Number(explicit[1]);
  const years = [...text.matchAll(/\b(19[89]\d|20[0-3]\d)\b/g)].map((m) => Number(m[1]));
  if (years.length < 2) return null;
  const span = new Date().getFullYear() - Math.min(...years);
  return span > 0 && span < 50 ? span : null;
}

function nonEmptyLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function demoParseResume(text: string): ParsedResume {
  const lines = nonEmptyLines(text);
  const roles = findTerms(text, ROLES);
  const years = yearsFromText(text);
  const achievements = lines
    .filter((l) => /\d+\s*%|€\s?\d|\d+\s?(k|m)\b|\b\d{2,}\b.*(users|customers|requests|engineers|people|team)/i.test(l))
    .slice(0, 8)
    .map((l) => ({ text: l.replace(/^[-•*]\s*/, ""), metric: l.match(/\d+(?:[.,]\d+)?\s*%|€\s?\d[\d.,]*\s?[km]?/i)?.[0] ?? null, company: null }));
  return {
    current_role: roles[0] ? titleCase(roles[0]) : null,
    summary: "Demo data: keyword-based extraction, not an AI reading of your CV.",
    years_experience: years,
    seniority: seniorityFromYears(years),
    location: text.match(/\b(Barcelona|Madrid|Valencia|Sevilla|Bilbao|Málaga|Lisbon|Berlin|London|Amsterdam|Paris|Dublin)\b/i)?.[0] ?? null,
    suggested_target_roles: roles.slice(0, 3).map(titleCase),
    skills: findTerms(text, SKILLS),
    industries: findTerms(text, INDUSTRIES),
    experience: [],
    achievements,
    education: [],
    languages: findTerms(text, ["english", "spanish", "catalan", "german", "french"]).map(titleCase),
  };
}

export function demoParseJob(description: string): ParsedJob {
  const lines = nonEmptyLines(description);
  const lower = description.toLowerCase();
  const workMode: ParsedJob["work_mode"] = /fully remote|100% remote|remote-first|\bremote\b/.test(lower)
    ? /hybrid/.test(lower) ? "hybrid" : "remote"
    : /hybrid/.test(lower) ? "hybrid" : /on-?site|in the office|office-based/.test(lower) ? "onsite" : "unknown";
  const days = lower.match(/(\d)\s*days?\s*(?:a|per)\s*week\s*(?:in the office|on-?site)/);
  const salary = salariesFromText(description);
  const yrs = lower.match(/(\d{1,2})\+?\s*years/);
  const skills = findTerms(description, SKILLS);
  const roles = findTerms(lines[0] ?? "", ROLES);
  return {
    title: roles[0] ? titleCase(roles[0]) : (lines[0]?.slice(0, 80) ?? null),
    company: null,
    location: description.match(/\b(Barcelona|Madrid|Valencia|Spain|Europe|EMEA|Lisbon|Berlin|London|Amsterdam|Paris|Dublin)\b/i)?.[0] ?? null,
    work_mode: workMode,
    onsite_days_per_week: days ? Number(days[1]) : workMode === "onsite" ? 5 : null,
    countries_allowed: [],
    salary_min_eur: salary.length ? Math.min(...salary) : null,
    salary_max_eur: salary.length ? Math.max(...salary) : null,
    salary_text: null,
    seniority: /principal|staff/.test(lower) ? "principal" : /head of|director|lead/.test(lower) ? "lead" : /senior|sr\./.test(lower) ? "senior" : /junior/.test(lower) ? "junior" : "unknown",
    years_experience_required: yrs ? Number(yrs[1]) : null,
    industry: findTerms(description, INDUSTRIES)[0] ?? null,
    must_have: skills.slice(0, 8),
    nice_to_have: skills.slice(8),
    responsibilities: [],
    languages_required: findTerms(description, ["english", "spanish", "catalan", "german", "french"]).map(titleCase),
  };
}

interface MatchInput {
  profile: { skills: string[]; industries: string[]; years_experience: number | null; seniority: string | null; target_roles: string[] };
  job: ParsedJob;
}

const SENIORITY_RANK: Record<string, number> = { junior: 1, mid: 2, senior: 3, lead: 4, principal: 5, executive: 6 };

export function demoMatch({ profile, job }: MatchInput): MatchAssessment {
  const have = new Set(profile.skills.map((s) => s.toLowerCase()));
  const required = job.must_have.map((s) => s.toLowerCase());
  const matched = required.filter((s) => have.has(s));
  const missing = required.filter((s) => !have.has(s));
  const skillScore = required.length ? Math.round((matched.length / required.length) * 100) : 60;

  const yrsReq = job.years_experience_required;
  const yrs = profile.years_experience;
  const expScore = yrsReq == null || yrs == null ? 60 : yrs >= yrsReq ? 95 : Math.max(20, Math.round((yrs / yrsReq) * 90));

  const want = SENIORITY_RANK[job.seniority];
  const mine = profile.seniority ? SENIORITY_RANK[profile.seniority] : undefined;
  const senScore = !want || !mine ? 60 : mine === want ? 95 : mine > want ? 75 : Math.max(20, 95 - (want - mine) * 30);

  const industryScore = job.industry == null ? 60 : profile.industries.map((i) => i.toLowerCase()).includes(job.industry.toLowerCase()) ? 90 : 45;

  const avg = (skillScore + expScore + senScore + industryScore) / 4;
  const recommendation: MatchAssessment["recommendation"] =
    avg >= 85 ? "STRONGLY_APPLY" : avg >= 72 ? "APPLY" : avg >= 60 ? "APPLY_IF_INTERESTED" : avg >= 45 ? "LOW_PRIORITY" : "DO_NOT_APPLY";

  return {
    experience: { score: expScore, rationale: yrsReq == null ? "The job does not state required years." : `Job asks for ${yrsReq}+ years; your profile says ${yrs ?? "unknown"}.` },
    skills: { score: skillScore, rationale: `${matched.length} of ${required.length} detected required skills appear in your profile.` },
    seniority: { score: senScore, rationale: `Job level: ${job.seniority}; your level: ${profile.seniority ?? "unknown"}.` },
    industry: { score: industryScore, rationale: job.industry ? `Job industry: ${job.industry}.` : "Industry not detected." },
    strengths: matched.slice(0, 8).map((s) => ({ point: `Has ${s}`, evidence: `"${s}" is listed in your profile skills.`, source: "profile" as const })),
    gaps: missing.slice(0, 8).map((s) => ({ requirement: s, importance: "must_have" as const, detail: `"${s}" is mentioned in the job but not in your profile.` })),
    risks: [],
    recommendation,
    reasoning: "Demo data: this verdict comes from keyword overlap, not from an AI assessment.",
  };
}

export function salariesFromText(text: string): number[] {
  const re = /(?:€|\beur\s?)\s?(\d{2,3}(?:[.,]\d{3})?)\s*(k)?|(\d{2,3}(?:[.,]\d{3})?)\s*(k)?\s?(?:€|eur\b)/gi;
  return [...text.matchAll(re)]
    .map((m) => {
      const raw = (m[1] ?? m[3]).replace(/[.,]/g, "");
      const n = Number(raw);
      return m[2] || m[4] || n < 1000 ? n * 1000 : n;
    })
    .filter((n) => n >= 10000 && n <= 1000000);
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export class DemoProvider implements AIProvider {
  readonly name = "demo";
  readonly isDemo = true;

  async generate<T>(req: StructuredRequest<T>): Promise<T> {
    const input = req.input as Record<string, unknown>;
    let out: unknown;
    switch (req.task) {
      case "resume_parser":
        out = demoParseResume(String(input.text));
        break;
      case "job_parser":
        out = demoParseJob(String(input.description));
        break;
      case "job_matcher":
        out = demoMatch(input as unknown as MatchInput);
        break;
      default:
        throw new AIError(`Demo provider has no handler for ${req.task}`, "This feature needs a real AI provider.");
    }
    return req.schema.parse(out);
  }
}
