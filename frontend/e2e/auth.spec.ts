import { expect, test } from "@playwright/test";
import { declineConsent, installApiFallback, mockJson, testAuthResponse, testUser } from "./fixtures";

test.describe("authentication pages", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
    await page.goto("/");
    await declineConsent(page);
    // Phones keep the header's Sign in link visible next to the menu button.
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("sign-in is a page, and links to the sign-up page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sign in", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: "Create your account", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("shows an API error when sign-in fails", async ({ page }) => {
    await mockJson(page, "/api/auth/login", { error: "Invalid email or password" }, 401);
    await page.getByLabel("Email").fill("tester@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("opens the password reset flow", async ({ page }) => {
    await mockJson(page, "/api/auth/forgot-password", { ok: true });
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await page.locator("#reset-email").fill("tester@example.com");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
  });

  test("returns to the page the visitor came from after signing in", async ({ page }) => {
    await page.goto("/compare");
    await page.getByRole("link", { name: "Sign in", exact: true }).first().click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcompare$/);

    await mockJson(page, "/api/auth/login", testAuthResponse);
    await page.getByLabel("Email").fill("tester@example.com");
    await page.getByLabel("Password").fill("correct-horse-battery");
    // After the redirect the app restores the session from /api/auth/me.
    await mockJson(page, "/api/auth/me", testUser);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/compare$/);
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  });

  test("tells a new account to check its inbox, and can resend the link", async ({ page }) => {
    await page.goto("/signup?next=%2Fcompare");
    await mockJson(page, "/api/auth/signup", testAuthResponse);
    await mockJson(page, "/api/auth/resend-verification", { status: "sent" });
    await page.getByLabel("Email").fill("tester@example.com");
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Create account", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
    await expect(page.getByText("tester@example.com")).toBeVisible();
    await page.getByRole("button", { name: "resend the link" }).click();
    await expect(page.getByText("Sent. Check your inbox.")).toBeVisible();

    await mockJson(page, "/api/auth/me", testUser);
    await page.getByRole("link", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/compare$/);
    // Just told on the previous screen, so the reminder bar stays away.
    await expect(page.getByText("Your email is not verified yet.")).toBeHidden();
  });

  test("reminds an unverified account on later visits", async ({ page }) => {
    await mockJson(page, "/api/auth/me", testUser);
    await page.goto("/guides");
    await expect(page.getByText("Your email is not verified yet.")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText("Your email is not verified yet.")).toBeHidden();
  });

  test("ignores a return target on another site", async ({ page }) => {
    await page.goto("/login?next=https%3A%2F%2Fevil.example%2Fphish");
    await mockJson(page, "/api/auth/login", testAuthResponse);
    await page.getByLabel("Email").fill("tester@example.com");
    await page.getByLabel("Password").fill("correct-horse-battery");
    await mockJson(page, "/api/auth/me", testUser);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/127\.0\.0\.1:4173\/$/);
  });
});
