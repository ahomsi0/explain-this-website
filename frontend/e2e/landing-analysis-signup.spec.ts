import { expect, test } from "@playwright/test";
import { declineConsent, installApiFallback, mockJson, testAuthResponse, testUser } from "./fixtures";

test.describe("landing to analysis to signup", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
    await mockJson(page, "/api/usage", {
      plan: "free", dailyLimit: 5, dailyUsed: 0, dailyRemaining: 5,
    });
    await page.goto("/");
    await declineConsent(page);
  });

  test("phones get a navigation menu and an Analyze button that stays inside its box", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Desktop shows the links inline and has room to spare.");
    const form = (await page.getByRole("form", { name: "Website analyzer" }).boundingBox())!;
    const analyze = (await page.getByRole("button", { name: "Analyze", exact: true }).boundingBox())!;
    expect(analyze.x + analyze.width).toBeLessThanOrEqual(form.x + form.width);

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(menu.getByRole("link", { name: "Fix guides" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Compare two sites" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Built with" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  // Runs on phones too: below md the sidebar is hidden and the header carries
  // its own "New audit" button, so a report is never a dead end.
  test("analyzes a URL and opens the report dashboard", async ({ page }) => {
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

    // Sign-up is its own page now; afterwards the visitor is back on the report.
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await page.getByLabel("Email").fill("tester@example.com");
    await page.getByLabel("Password").fill("correct-horse-battery");
    await mockJson(page, "/api/auth/me", testUser);
    await page.getByRole("button", { name: "Create account", exact: true }).click();

    // The page first says a verification email is on its way, then lets them carry on.
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
    await expect(page.getByText("tester@example.com")).toBeVisible();
    await page.getByRole("link", { name: "Continue" }).click();

    await expect(page.getByText("Example Store — Best Widgets Online")).toBeVisible({ timeout: 10_000 });

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
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  });
});
