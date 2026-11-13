import { expect, test } from "@playwright/test";
import { mockAnalysisResult } from "../src/mock/mockData";
import { declineConsent, installApiFallback, mockJson, testUser } from "./fixtures";

const reportId = "c".repeat(32);
const APP_PAGE = "https://app.example.test/dashboard";

const dashboardHtml = `<!doctype html><html><head><title>Team dashboard</title></head>
<body><h1>Team dashboard</h1><p>Welcome back, Sam. You have 3 open invoices.</p></body></html>`;

const capturedReport = {
  ...mockAnalysisResult,
  url: APP_PAGE,
  overview: { ...mockAnalysisResult.overview, title: "Team dashboard" },
  capture: { source: "paste", hasHeaders: false },
  securityHeaders: [],
  performance: undefined,
  aiSummary: undefined,
};

test.describe("analyzing a page behind a login", () => {
  test("a pasted page becomes a private report", async ({ page, isMobile }) => {
    await installApiFallback(page);
    await mockJson(page, "/api/auth/me", testUser);
    await mockJson(page, "/api/usage", testUser.usage);
    await mockJson(page, `/api/report/${reportId}`, capturedReport);

    let posted: Record<string, unknown> | null = null;
    await page.route("**/api/analyze-capture", async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ json: { ...capturedReport, reportId } });
    });

    // The explainer page leads to the paste form.
    await page.goto("/behind-login");
    await declineConsent(page);
    await page.getByRole("link", { name: "Paste a page" }).click();
    await expect(page).toHaveURL(/\/capture$/);

    await page.getByLabel("Page address").fill("app.example.test/dashboard");
    await page.getByLabel("Page source").fill(dashboardHtml);
    await page.getByRole("button", { name: "Continue" }).click();

    // The confirm step shows what is about to be sent and waits for a yes.
    await expect(page.getByRole("heading", { name: "Analyze this page?" })).toBeVisible();
    await expect(page.getByText("app.example.test/dashboard")).toBeVisible();
    expect(posted).toBeNull();

    await page.getByRole("button", { name: "Analyze this page" }).click();
    await expect(page).toHaveURL(new RegExp(`/report/${reportId}$`));

    expect(posted).not.toBeNull();
    expect(posted!.url).toBe(APP_PAGE);
    expect(posted!.source).toBe("paste");
    expect(String(posted!.html)).toContain("You have 3 open invoices.");

    // The report says it is private and has no way to share it.
    await expect(page.getByText("Analyzed from page source you pasted.")).toBeVisible();
    await expect(page.getByText("Only you can open this report.")).toBeVisible();
    if (!isMobile) {
      const toolbar = page.getByRole("group", { name: "Report actions" });
      await expect(toolbar.getByRole("button", { name: "Download report as PDF" })).toBeVisible();
      await expect(toolbar.getByRole("button", { name: "Share report" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Re-run fresh" })).toHaveCount(0);
    }
  });

  test("a report of a sign-in page says so and points to the way around it", async ({ page }) => {
    await page.route("**/api/**", (route) => route.fulfill({
      status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not mocked in this test" }),
    }));
    await page.route(`**/api/report/${reportId}`, (route) => route.fulfill({ json: { ...mockAnalysisResult, loginWall: true } }));

    await page.goto(`/report/${reportId}`);
    await declineConsent(page);

    await expect(page.getByText("This looks like a sign-in page")).toBeVisible();
    await page.getByRole("link", { name: "Analyze the page behind the login" }).click();
    await expect(page.getByRole("heading", { name: "Analyze a page behind a login" })).toBeVisible();
  });
});
