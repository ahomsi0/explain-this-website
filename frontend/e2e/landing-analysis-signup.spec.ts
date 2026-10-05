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
    await expect(page.getByRole("heading", { name: "Audit Overview", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Audit" })).toBeVisible();

    await page.getByRole("button", { name: "Report actions" }).click();
    const actionsMenu = page.getByRole("menu", { name: "Report actions menu" });
    await expect(actionsMenu).toBeVisible();
    await expect(actionsMenu.getByRole("button", { name: "Copy report" })).toBeVisible();
    await expect(actionsMenu.getByRole("button", { name: "Download report as PDF" })).toBeVisible();
    await expect(actionsMenu.getByRole("button", { name: "Copy embeddable score badge" })).toBeVisible();
    await expect(actionsMenu.getByRole("button", { name: "Share report" })).toBeVisible();
    await page.getByRole("button", { name: "Report actions" }).click();
    await expect(actionsMenu).toBeHidden();
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

  test("keeps the report toolbar within the viewport on compact screens", async ({ page }) => {
    await page.setViewportSize({ width: 736, height: 600 });
    await page.getByLabel("Website URL to analyze").fill("example.com");
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Audit Overview", exact: true })).toBeVisible({ timeout: 10_000 });

    const header = page.locator('header:has([aria-label="Report actions"])');
    await expect(header).toBeVisible();
    const widths = await header.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileWidths = await header.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(mobileWidths.scrollWidth).toBeLessThanOrEqual(mobileWidths.clientWidth);
    await expect(page.getByRole("button", { name: "Report actions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  });
});
