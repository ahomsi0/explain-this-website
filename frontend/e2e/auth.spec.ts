import { expect, test } from "@playwright/test";
import { declineConsent, installApiFallback, mockJson } from "./fixtures";

test.describe("authentication interactions", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
    await page.goto("/");
    await declineConsent(page);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  });

  test("switches between sign-in and sign-up modes", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
  });

  test("shows an API error when sign-in fails", async ({ page }) => {
    await mockJson(page, "/api/auth/login", { error: "Invalid email or password" }, 401);
    await page.getByLabel("Email").fill("tester@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("opens the password reset flow", async ({ page }) => {
    await mockJson(page, "/api/auth/forgot-password", { ok: true });
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await page.locator("#reset-email").fill("tester@example.com");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
  });
});
