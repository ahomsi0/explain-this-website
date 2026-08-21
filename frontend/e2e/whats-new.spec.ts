import { expect, test } from "@playwright/test";
import { installApiFallback } from "./fixtures";

test.describe("what's new page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
  });

  test("renders the changelog and links back to the analyzer", async ({ page }) => {
    await page.goto("/whats-new");

    await expect(page).toHaveTitle("What’s New · Explain This Website");
    await expect(page.getByRole("heading", { name: "What's new" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reports now explain the full picture" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to analyzer" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy");
  });

  test("is discoverable from the landing page footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "What's new" })).toHaveAttribute("href", "/whats-new");
  });
});
