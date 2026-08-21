import { expect, test } from "@playwright/test";
import { declineConsent, installApiFallback, mockJson, testAuthResponse } from "./fixtures";

test.describe("landing to analysis to signup", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
    await mockJson(page, "/api/usage", {
      plan: "free", dailyLimit: 5, dailyUsed: 0, dailyRemaining: 5,
    });
    await page.goto("/");
    await declineConsent(page);
  });

  test("analyzes a URL and opens the report dashboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "The New Audit CTA is in the desktop sidebar.");
    await page.getByLabel("Website URL to analyze").fill("example.com");
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    await expect(page.getByText("Example Store — Best Widgets Online")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Audit" })).toBeVisible();
  });

  test("completes signup from the report screen", async ({ page }) => {
    await mockJson(page, "/api/auth/signup", testAuthResponse);
    await page.getByLabel("Website URL to analyze").fill("example.com");
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByText("Example Store — Best Widgets Online")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await page.getByLabel("Email").fill("tester@example.com");
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Create account", exact: true }).click();

    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByText("tester@example.com")).toBeVisible();
    expect(page.url()).toContain("127.0.0.1:4173");
  });
});
