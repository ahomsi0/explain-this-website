import { expect, test } from "@playwright/test";
import { declineConsent, installApiFallback } from "./fixtures";

test.describe("landing page backdrop", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
    await page.goto("/");
    await declineConsent(page);
  });

  test("the window's address bar shows what is typed in the URL field", async ({ page, isMobile }) => {
    test.skip(isMobile, "the backdrop is not shown on phones");
    const address = page.getByTestId("hero-window-address");
    await expect(address).toHaveText("");

    await page.getByLabel("Website URL to analyze").fill("stripe.com/pricing");
    await expect(address).toHaveText("stripe.com/pricing");
  });

  test("the highlight follows the cursor and names what it points at", async ({ page, isMobile }) => {
    test.skip(isMobile, "the backdrop is not shown on phones");
    await page.setViewportSize({ width: 1440, height: 860 });
    const title = page.locator(".hero-window-line", { hasText: "Title" });
    const label = title.locator(".hero-window-label");
    await expect(label).toHaveCSS("opacity", "0");

    const box = (await title.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 12);
    await expect(title).toHaveClass(/is-active/);
    await expect(label).toHaveCSS("opacity", "1");

    // Back over the hero, the label goes away again.
    await page.mouse.move(720, 300);
    await expect(label).toHaveCSS("opacity", "0");
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
