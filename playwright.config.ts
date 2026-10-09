import { defineConfig, devices } from "@playwright/test";

// E2E runs the production build against a separate database with the demo AI provider,
// so it needs no API key. Set E2E_DATABASE_URL to point at a disposable database.
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://jobfinding@localhost:5433/jobfinding_test";
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx prisma migrate deploy && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL, AI_PROVIDER: "demo", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  },
});
