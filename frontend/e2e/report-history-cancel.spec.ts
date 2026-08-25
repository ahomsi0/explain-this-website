import { expect, test } from "@playwright/test";
import { mockAnalysisResult } from "../src/mock/mockData";
import { declineConsent, installApiFallback, mockJson, testUser } from "./fixtures";

const reportId = "a".repeat(32);

test.describe("report, history, and cancellation flows", () => {
  test("cancels an in-progress analysis and returns to the landing page", async ({ page }) => {
    await installApiFallback(page);
    await page.goto("/");
    await declineConsent(page);
    await page.getByLabel("Website URL to analyze").fill("example.com");
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByRole("button", { name: "Cancel analysis" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel analysis" }).click();
    await expect(page.getByLabel("Website URL to analyze")).toBeVisible();
  });

  test("loads a shared report and starts a new audit", async ({ page, isMobile }) => {
    test.skip(isMobile, "The New Audit CTA is in the desktop sidebar.");
    await installApiFallback(page);
    await mockJson(page, `/api/report/${reportId}`, mockAnalysisResult);
    await page.goto(`/report/${reportId}`);
    await declineConsent(page);
    await expect(page.getByText("Example Store — Best Widgets Online")).toBeVisible();
    await page.getByRole("button", { name: "New Audit" }).click();
    await expect(page.getByLabel("Website URL to analyze")).toBeVisible();
  });

  test("opens history and compares two saved audits", async ({ page }) => {
    await installApiFallback(page);
    await mockJson(page, "/api/auth/me", testUser);
    await mockJson(page, "/api/usage", testUser.usage);
    await mockJson(page, "/api/audits*", {
      items: [
        { id: "audit-1", url: "https://before.example.com", title: "Before report", createdAt: "2026-08-19T00:00:00Z", shareable: false },
        { id: "audit-2", url: "https://after.example.com", title: "After report", createdAt: "2026-08-20T00:00:00Z", shareable: false },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });
    await page.route("**/api/audits/compare**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        before: { id: "audit-1", url: "https://before.example.com", title: "Before report", createdAt: "2026-08-19T00:00:00Z", seoScore: 40, uxScore: 45, conversionScore: 35, performanceScore: 50, priorityIssueCount: 5, brokenLinkCount: 2, securityFailureCount: 3 },
        after: { id: "audit-2", url: "https://after.example.com", title: "After report", createdAt: "2026-08-20T00:00:00Z", seoScore: 80, uxScore: 75, conversionScore: 70, performanceScore: 85, priorityIssueCount: 2, brokenLinkCount: 0, securityFailureCount: 1 },
      }),
    }));
    await page.goto("/");
    await declineConsent(page);
    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Audit history" })).toBeVisible();
    await expect(page.getByText("Before report")).toBeVisible();
    await expect(page.getByText("After report")).toBeVisible();
    await page.getByRole("listitem").filter({ hasText: "Before report" }).getByRole("button", { name: "Compare", exact: true }).click();
    await page.getByRole("listitem").filter({ hasText: "After report" }).getByRole("button", { name: "Compare", exact: true }).click();
    await page.getByRole("button", { name: "Compare selected" }).click();
    await expect(page.getByRole("heading", { name: "How this site changed over time" })).toBeVisible();
  });
});
