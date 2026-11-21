import { expect, test } from "@playwright/test";
import { installApiFallback } from "./fixtures";

test.describe("privacy and analytics consent", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
    // Serve an empty stand-in for Google's script: the tests only check
    // whether it is requested, and nothing should reach Google.
    await page.route("**/googletagmanager.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
    );
  });

  test("does not load analytics when consent is declined", async ({ page }) => {
    const analyticsRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("googletagmanager.com")) analyticsRequests.push(request.url());
    });

    await page.goto("/");
    const banner = page.getByRole("dialog", { name: "Analytics consent" });
    await expect(banner).toBeVisible();
    expect(analyticsRequests).toHaveLength(0);
    await banner.getByRole("button", { name: "Decline" }).click();
    expect(analyticsRequests).toHaveLength(0);
  });

  test("loads analytics only after consent is granted", async ({ page }) => {
    const analyticsRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("googletagmanager.com")) analyticsRequests.push(request.url());
    });

    await page.goto("/");
    await page.getByRole("dialog", { name: "Analytics consent" }).getByRole("button", { name: "Allow analytics" }).click();
    await expect.poll(() => analyticsRequests.length).toBe(1);
    await expect(page.getByRole("dialog", { name: "Analytics consent" })).toBeHidden();
  });

  test("keeps the privacy page focused on policy content", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText(/Analytics preference:/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Information we process" })).toBeVisible();
  });
});
