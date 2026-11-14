import { expect, test } from "@playwright/test";
import { declineConsent, installApiFallback } from "./fixtures";

test.describe("landing page backdrop", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
    await page.goto("/");
    await declineConsent(page);
  });

  test("the address bar types examples, then shows what the visitor types", async ({ page, isMobile }) => {
    test.skip(isMobile, "the backdrop is not shown on phones");
    const address = page.getByTestId("hero-window-address");
    await expect(address).toHaveText("your-site.com", { timeout: 5000 });

    await page.getByLabel("Website URL to analyze").fill("stripe.com/pricing");
    await expect(address).toHaveText("stripe.com/pricing");
  });

  test("the window's three dots close, minimize and zoom it", async ({ page, isMobile }) => {
    test.skip(isMobile, "the backdrop is not shown on phones");
    await page.setViewportSize({ width: 1440, height: 860 });
    const backdrop = page.locator(".hero-window");
    const frame = page.locator(".hero-window-frame");
    await expect(backdrop).toHaveAttribute("data-state", "open");
    const openWidth = (await frame.boundingBox())!.width;

    await page.locator('[data-control="zoom"]').click();
    await expect(backdrop).toHaveAttribute("data-state", "full");
    await expect.poll(async () => (await frame.boundingBox())!.width).toBeGreaterThan(openWidth);
    await page.locator('[data-control="zoom"]').click();
    await expect(backdrop).toHaveAttribute("data-state", "open");

    await page.locator('[data-control="minimize"]').click();
    await expect(backdrop).toHaveAttribute("data-state", "minimized");
    await expect.poll(async () => (await frame.boundingBox())!.height).toBeLessThan(50);
    await page.locator('[data-control="minimize"]').click();

    await page.locator('[data-control="close"]').click();
    await expect(backdrop).toHaveAttribute("data-state", "closed");
    await expect(frame).toHaveCSS("opacity", "0");
    await page.getByText("Reopen window").click();
    await expect(backdrop).toHaveAttribute("data-state", "open");
  });

  test("the backdrop never gets in the way of the form", async ({ page }) => {
    await page.getByLabel("Website URL to analyze").fill("example.com");
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByRole("button", { name: "Cancel analysis" })).toBeVisible();
  });

  test("phones get the plain page", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone only");
    await expect(page.locator(".hero-window")).toBeHidden();
  });
});
