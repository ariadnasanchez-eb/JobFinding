# AI Career Coach

A decision engine for tech professionals' job searches: upload your CV, confirm your career profile, paste a job
description and get an evidence-based match report that says whether the job is worth applying to.

This repository currently contains **vertical slice #1** of the MVP described in the product spec:

```
Landing page → Sign up → Upload CV → Parse CV → Career profile → Paste job → Analyze match → Match report
```

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 6 · Anthropic Claude
API behind a provider interface · Vitest + Playwright.

## Getting started

```bash
cp .env.example .env          # set DATABASE_URL and ANTHROPIC_API_KEY
npm install
npx prisma migrate deploy     # creates the tables
npm run dev                   # http://localhost:3000
```

No API key yet? Set `AI_PROVIDER="demo"`. The whole flow then runs on keyword heuristics, with a banner and a
"Demo data" label on every generated output so it is never mistaken for a real AI assessment.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser test of the full slice against a production build, demo AI, and `E2E_DATABASE_URL` |
| `npm run typecheck` / `npm run lint` | Type and lint checks |
| `npm run db:migrate` | Create a new migration after editing `prisma/schema.prisma` |

## How it is organised

```
src/app/(auth)/            sign up, log in, log out (server actions)
src/app/(app)/             signed-in pages: onboarding, profile, jobs, dashboard, settings
src/app/(app)/actions.ts   CV upload, profile save, job analysis, CV/account deletion
src/lib/ai/                provider interface, Anthropic provider, demo provider, output schemas
src/lib/services/          resume_parser, job_parser, job_matcher, deterministic scoring
src/lib/cv/extract.ts      file validation (type by magic bytes, 5 MB limit), PDF/DOCX text extraction, contact redaction
prisma/schema.prisma       data model
```

### AI design

- Each AI step is its own service with its own prompt and Zod schema (`resume_parser`, `job_parser`, `job_matcher`).
  Outputs use structured outputs, are validated again before use, and are retried once if malformed.
- The app talks to `AIProvider`, not to a vendor SDK. Adding another LLM vendor means one new class in `src/lib/ai/`.
- The overall match score is computed in code from weighted dimensions (experience 30%, skills 30%, seniority 15%,
  industry 10%, location 15%). Location fit and salary compatibility are deterministic checks against the user's stated
  preferences; the model scores experience, skills, seniority and industry and gives the recommendation.
- Prompts forbid inventing experience, metrics or technologies; document text is passed as delimited data.

### Privacy

- Every query is scoped to the signed-in user; another user's job id returns 404.
- Email addresses, phone numbers and LinkedIn URLs are stripped from CV text before it is sent to the model, and the
  matcher receives no name or email.
- Only extracted CV text is stored (not the original file). Users can delete their CVs or their whole account from
  Settings; deletion cascades to all their data.
- Passwords are hashed with bcrypt; sessions are random tokens stored only as SHA-256 hashes.
