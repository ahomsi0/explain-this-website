import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { declineConsent, installApiFallback, mockJson } from "./fixtures";

// Dark is the default theme every first-time visitor (and scanner) sees.
// Light-theme contrast is tracked separately.

async function expectNoViolations(page: Page, label: string) {
  // Freeze fades so colours are final when axe measures contrast.
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none !important;animation:none !important}" });
  const { violations } = await new AxeBuilder({ page }).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `${label} accessibility violations`).toEqual([]);
}

test.describe("accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
    await mockJson(page, "/api/usage", { plan: "free", dailyLimit: 5, dailyUsed: 0, dailyRemaining: 5 });
    await page.goto("/");
  });

  test("landing page with the consent banner has no violations", async ({ page }) => {
    await expect(page.getByRole("dialog", { name: "Analytics consent" })).toBeVisible();
    await expectNoViolations(page, "landing + consent banner");
  });

  test("landing page has no violations after consent is declined", async ({ page }) => {
    await declineConsent(page);
    await expect(page.getByRole("main")).toBeVisible();
    await expectNoViolations(page, "landing");
  });

  test("report sections have no violations", async ({ page, isMobile }) => {
    test.skip(isMobile, "The section sidebar is desktop-only; the phone report header is tracked separately.");
    await declineConsent(page);
    await page.getByLabel("Website URL to analyze").fill("example.com");
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByText("Example Store — Best Widgets Online")).toBeVisible({ timeout: 10_000 });
    await expectNoViolations(page, "report: Overview");

    for (const name of ["Fix Plan", "Tech Stack", "SEO Audit", "UX Review", "Performance", "Conversion"]) {
      await page.getByRole("button", { name }).first().click();
      await expectNoViolations(page, `report: ${name}`);
    }
  });
});
