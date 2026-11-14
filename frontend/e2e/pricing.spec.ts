import { expect, test } from "@playwright/test";
import { installApiFallback } from "./fixtures";

test.describe("pricing", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
  });

  test("shows the plans and leads to the refund policy", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page).toHaveTitle("Pricing · Explain This Website");
    await expect(page.getByRole("heading", { level: 1, name: "Pricing" })).toBeVisible();
    await expect(page.getByText("$59")).toBeVisible();
    await expect(page.getByText(/or \$7 a month/)).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "API keys and webhooks" })).toBeVisible();

    await page.getByRole("link", { name: "refund policy" }).click();
    await expect(page).toHaveURL(/\/refunds$/);
    await expect(page.getByRole("heading", { level: 1, name: "Refund Policy" })).toBeVisible();
  });

  test("is linked from the footer, next to the refund policy", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    await expect(footer.getByRole("link", { name: "Refunds" })).toHaveAttribute("href", "/refunds");
  });

  test("the old address still shows the pricing page", async ({ page }) => {
    await page.goto("/go-pro");
    await expect(page.getByRole("heading", { level: 1, name: "Pricing" })).toBeVisible();
  });
});
