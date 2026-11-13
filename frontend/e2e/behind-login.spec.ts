import { expect, test } from "@playwright/test";
import { mockAnalysisResult } from "../src/mock/mockData";
import { declineConsent, testUser } from "./fixtures";

const reportId = "c".repeat(32);
const APP_PAGE = "https://app.example.test/dashboard";

const dashboardHtml = `<!doctype html><html><head><title>Team dashboard</title></head>
<body><h1>Team dashboard</h1><p>Welcome back, Sam. You have 3 open invoices.</p></body></html>`;

const capturedReport = {
  ...mockAnalysisResult,
  url: APP_PAGE,
  overview: { ...mockAnalysisResult.overview, title: "Team dashboard" },
  capture: { source: "browser", hasHeaders: true, timings: { ttfbMs: 120, loadMs: 1800, lcpMs: 900, cls: 0.02, hasCls: true, requests: 41 } },
  performance: undefined,
  aiSummary: undefined,
};

test.describe("analyzing a page behind a login", () => {
  test("the bookmark button hands a signed-in page to a private report", async ({ page, context, isMobile }) => {
    test.skip(isMobile, "bookmark buttons are a desktop browser feature");

    // Routes are set on the context so the tab the button opens gets them too.
    await context.route("**/api/**", (route) => route.fulfill({
      status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not mocked in this test" }),
    }));
    await context.route("**/api/auth/me", (route) => route.fulfill({ json: testUser }));
    await context.route("**/api/usage", (route) => route.fulfill({ json: testUser.usage }));
    await context.route(`**/api/report/${reportId}`, (route) => route.fulfill({ json: capturedReport }));

    let posted: Record<string, unknown> | null = null;
    await context.route("**/api/analyze-capture", async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ json: { ...capturedReport, reportId } });
    });

    // A page on another site, standing in for the visitor's logged-in app.
    let headRequests = 0;
    await context.route("https://app.example.test/**", (route) => {
      if (route.request().method() === "HEAD") headRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        headers: { "strict-transport-security": "max-age=63072000", "x-request-id": "private-trace" },
        body: route.request().method() === "HEAD" ? "" : dashboardHtml,
      });
    });

    // Pick the button up from the page that offers it.
    await page.goto("/behind-login");
    await declineConsent(page);
    const button = page.getByRole("link", { name: "Explain this page" });
    await expect(button).toHaveAttribute("href", /^javascript:/);
    const script = decodeURIComponent((await button.getAttribute("href"))!.slice("javascript:".length));

    // Clicking it on the explainer page itself only explains what to do.
    await button.click();
    await expect(page.getByText("Drag it up to the bookmarks bar.")).toBeVisible();

    // "Click the bookmark" on the logged-in page.
    await page.goto(APP_PAGE);
    await expect(page.getByRole("heading", { name: "Team dashboard" })).toBeVisible();
    const [tab] = await Promise.all([
      context.waitForEvent("page"),
      page.evaluate((source) => { new Function(source)(); }, script),
    ]);

    // The new tab shows what arrived and waits for a yes.
    await expect(tab.getByRole("heading", { name: "Analyze this page?" })).toBeVisible();
    await expect(tab.getByText("app.example.test/dashboard")).toBeVisible();
    expect(posted).toBeNull();
    await declineConsent(tab);

    await tab.getByRole("button", { name: "Analyze this page" }).click();
    await expect(tab).toHaveURL(new RegExp(`/report/${reportId}$`));

    // What was sent: the page as the browser saw it, and only the headers the report uses.
    expect(posted).not.toBeNull();
    expect(posted!.url).toBe(APP_PAGE);
    expect(posted!.source).toBe("browser");
    expect(String(posted!.html)).toContain("You have 3 open invoices.");
    expect(posted!.headers).toEqual({ "strict-transport-security": "max-age=63072000" });
    expect(headRequests).toBe(1);

    // The report says it is private and has no way to share it.
    await expect(tab.getByText("Captured from your browser.")).toBeVisible();
    await expect(tab.getByText("Only you can open this report.")).toBeVisible();
    const toolbar = tab.getByRole("group", { name: "Report actions" });
    await expect(toolbar.getByRole("button", { name: "Download report as PDF" })).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "Share report" })).toHaveCount(0);
    await expect(tab.getByRole("button", { name: "Re-run fresh" })).toHaveCount(0);

    // Speed comes from the browser's own timings.
    await tab.getByRole("button", { name: "Performance" }).first().click();
    await expect(tab.getByText("Load timings from your browser")).toBeVisible();
    await expect(tab.getByText("Largest paint")).toBeVisible();
  });

  test("a report of a sign-in page says so and points to the way around it", async ({ page }) => {
    await page.route("**/api/**", (route) => route.fulfill({
      status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not mocked in this test" }),
    }));
    await page.route(`**/api/report/${reportId}`, (route) => route.fulfill({ json: { ...mockAnalysisResult, loginWall: true } }));

    await page.goto(`/report/${reportId}`);
    await declineConsent(page);

    await expect(page.getByText("This looks like a sign-in page")).toBeVisible();
    await page.getByRole("link", { name: "Analyze the page behind the login" }).click();
    await expect(page.getByRole("heading", { name: "Analyze a page behind a login" })).toBeVisible();
  });
});
