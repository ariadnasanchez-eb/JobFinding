import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const fixture = (name: string) => path.join(process.cwd(), "tests", "fixtures", name);

test("landing → sign up → upload CV → review profile → analyze job → match report", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Stop applying blindly. Start applying strategically." })).toBeVisible();
  await page.getByRole("link", { name: "Analyze my career" }).first().click();

  // Sign up, including a validation round-trip.
  await page.getByLabel("Name").fill("Laura Gómez");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 10 characters")).toBeVisible();
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();

  // Upload CV.
  await expect(page.getByRole("heading", { name: "Upload your CV" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(fixture("sample-cv.docx"));
  await page.getByRole("button", { name: "Upload and analyze" }).click();

  // Review the extracted profile.
  await expect(page.getByRole("heading", { name: "Review your career profile" })).toBeVisible();
  await expect(page.getByLabel("Years of experience")).toHaveValue("12");
  await expect(page.getByLabel("Current role")).toHaveValue("Engineering Manager");
  await expect(page.getByText("Demo data").first()).toBeVisible();
  await page.getByLabel("Target roles").fill("Technical Program Manager, Engineering Manager");
  await page.getByLabel("Work mode").selectOption("remote");
  await page.getByLabel("Countries you can work in").fill("Spain");
  await page.getByLabel("Target salary (€ / year, gross)").fill("85000");
  await page.getByLabel("Minimum acceptable salary (€ / year)").fill("70000");
  await page.getByRole("button", { name: "Confirm profile and continue" }).click();

  // Paste a job and analyze it.
  await expect(page.getByRole("heading", { name: "Analyze your first job" })).toBeVisible();
  await page.getByLabel("Job description").fill(readFileSync(fixture("sample-job.txt"), "utf8"));
  await page.getByLabel("Company (optional)").fill("Finlane");
  await page.getByRole("button", { name: "Analyze match" }).click();

  // Match report.
  await expect(page.getByText("Match report", { exact: true })).toBeVisible();
  await expect(page.getByTestId("match-score")).toHaveText(/^\d{1,3}%$/);
  await expect(page.getByRole("heading", { name: "Strong matches" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gaps" })).toBeVisible();
  // Hybrid role vs. remote preference is a computed risk.
  await expect(page.getByText(/Role is hybrid with 2 days onsite per week/)).toBeVisible();
  await expect(page.getByText("Compatible", { exact: true })).toBeVisible();

  // It appears on the dashboard.
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByText("Jobs analyzed")).toBeVisible();
  await expect(page.getByRole("link", { name: /Finlane/ })).toBeVisible();
});

test("a signed-out visitor is sent to log in, and another user's report is not visible", async ({ page, browser }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  // User A creates a report.
  const a = await browser.newContext();
  const pa = await a.newPage();
  await pa.goto("/signup");
  await pa.getByLabel("Name").fill("User A");
  await pa.getByLabel("Email").fill(`a-${Date.now()}@example.com`);
  await pa.getByLabel("Password").fill("correct horse battery");
  await pa.getByRole("button", { name: "Create account" }).click();
  await pa.locator('input[type="file"]').setInputFiles(fixture("sample-cv.pdf"));
  await pa.getByRole("button", { name: "Upload and analyze" }).click();
  await pa.getByRole("button", { name: "Confirm profile and continue" }).click();
  await pa.getByLabel("Job description").fill(readFileSync(fixture("sample-job.txt"), "utf8"));
  await pa.getByRole("button", { name: "Analyze match" }).click();
  await expect(pa.getByTestId("match-score")).toBeVisible();
  const reportUrl = pa.url();

  // User B can't open it.
  const b = await browser.newContext();
  const pb = await b.newPage();
  await pb.goto("/signup");
  await pb.getByLabel("Name").fill("User B");
  await pb.getByLabel("Email").fill(`b-${Date.now()}@example.com`);
  await pb.getByLabel("Password").fill("correct horse battery");
  await pb.getByRole("button", { name: "Create account" }).click();
  await expect(pb.getByRole("heading", { name: "Upload your CV" })).toBeVisible();
  const res = await pb.goto(reportUrl);
  expect(res?.status()).toBe(404);
  await expect(pb.getByText("isn't yours to see")).toBeVisible();
});

test("rejects a file that isn't a real PDF or DOCX", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("User C");
  await page.getByLabel("Email").fill(`c-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf") });
  await page.getByRole("button", { name: "Upload and analyze" }).click();
  await expect(page.getByText("Upload a PDF or DOCX file.")).toBeVisible();
});
