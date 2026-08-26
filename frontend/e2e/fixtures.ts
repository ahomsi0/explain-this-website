import { expect, type Page } from "@playwright/test";

export const API_URL = "http://localhost:8080";

export const testUser = {
  id: 7,
  email: "tester@example.com",
  createdAt: "2026-08-21T00:00:00Z",
  plan: "free" as const,
  subscriptionStatus: "inactive",
  usage: { plan: "free" as const, dailyLimit: 5, dailyUsed: 1, dailyRemaining: 4 },
  billingEnabled: false,
};

export const testAuthResponse = {
  user: testUser,
};

export async function installApiFallback(page: Page): Promise<void> {
  await page.route("**/api/**", (route) => route.fulfill({
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({ error: "Not mocked in this test" }),
  }));
}

export async function mockJson(page: Page, path: string, body: unknown, status = 200): Promise<void> {
  await page.route(`**${path}`, (route) => route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }));
}

export async function declineConsent(page: Page): Promise<void> {
  // The banner can be clicked while the web font is still swapping, which
  // reflows the page mid-click. fonts.ready alone can resolve before the font
  // has started loading, so explicitly request the weights the UI uses.
  await page.evaluate(() =>
    Promise.all([
      document.fonts.load("400 12px Inter"),
      document.fonts.load("500 12px Inter"),
      document.fonts.load("600 12px Inter"),
      document.fonts.load("700 12px Inter"),
      document.fonts.ready,
    ]).then(() => {}),
  );
  const banner = page.getByRole("dialog", { name: "Analytics consent" });
  if (await banner.count()) {
    await banner.getByRole("button", { name: "Decline" }).click();
    await expect(banner).toBeHidden();
  }
}
