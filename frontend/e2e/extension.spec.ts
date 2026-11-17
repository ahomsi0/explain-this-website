// The Chrome extension, loaded for real into Chromium.
//
// Automation cannot click a toolbar icon, so two things differ from what a
// person does. The popup is opened as a background tab, where it sees the page
// under test as the current tab, exactly as it would when opened from the
// toolbar. And the test build of the extension may read any page without that
// click (see writeUnpacked in extension/pack.mjs). Everything after the click
// is the shipped code: popup, background worker, page reader, the handover
// script and the site's capture page.

import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { mockAnalysisResult } from "../src/mock/mockData";
import { testUser } from "./fixtures";
// @ts-expect-error plain JavaScript module with no type declarations
import { writeUnpacked } from "../../extension/pack.mjs";

const reportId = "e".repeat(32);
const APP_PAGE = "https://app.example.test/dashboard";

const dashboardHtml = `<!doctype html><html><head><title>Team dashboard</title></head>
<body><h1>Team dashboard</h1><p>Welcome back, Sam. You have 3 open invoices.</p></body></html>`;

const capturedReport = {
  ...mockAnalysisResult,
  url: APP_PAGE,
  overview: { ...mockAnalysisResult.overview, title: "Team dashboard" },
  capture: { source: "browser", hasHeaders: true, timings: { loadMs: 840, ttfbMs: 120 } },
  performance: undefined,
  aiSummary: undefined,
};

const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

type Setup = { context: BrowserContext; appPage: Page; openPopup: () => Promise<Page>; cleanup: () => Promise<void> };

async function launchWithExtension(site: string, signedIn: boolean): Promise<Setup> {
  const work = mkdtempSync(path.join(tmpdir(), "etw-extension-test-"));
  const extensionDir = path.join(work, "extension");
  writeUnpacked({ outDir: extensionDir, site, testAccess: true });

  const context = await chromium.launchPersistentContext(path.join(work, "profile"), {
    channel: "chromium",
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
  });

  await context.route("**/api/**", (route) => route.fulfill(json({ error: "Not mocked in this test" }, 404)));
  await context.route("**/api/auth/me", (route) => route.fulfill(signedIn ? json(testUser) : json({ error: "not signed in" }, 401)));
  await context.route("**/api/usage", (route) => route.fulfill(json(testUser.usage)));
  await context.route(`**/api/report/${reportId}`, (route) => route.fulfill(json(capturedReport)));

  // The page "behind a login". A HEAD request gets its headers and no body.
  await context.route("https://app.example.test/**", (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    headers: { "x-frame-options": "DENY", "x-powered-by": "Express", "set-cookie": "session=secret" },
    body: route.request().method() === "HEAD" ? "" : dashboardHtml,
  }));

  const appPage = await context.newPage();
  await appPage.goto(APP_PAGE);

  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const openPopup = async () => {
    await appPage.bringToFront();
    const opened = context.waitForEvent("page");
    await worker.evaluate(() => chrome.tabs.create({ url: chrome.runtime.getURL("popup.html"), active: false }));
    return opened;
  };

  const cleanup = async () => {
    await context.close();
    rmSync(work, { recursive: true, force: true });
  };
  return { context, appPage, openPopup, cleanup };
}

test.describe("the Chrome extension", () => {
  test.skip(({ isMobile }) => isMobile, "Chrome extensions are for desktop Chrome.");
  // Each test starts its own browser with the extension installed.
  test.describe.configure({ timeout: 90_000 });

  test("one click sends a signed-in page to the site and opens a private report", async ({ baseURL }) => {
    const { context, openPopup, cleanup } = await launchWithExtension(baseURL!, true);
    try {
      let posted: Record<string, unknown> | null = null;
      await context.route("**/api/analyze-capture", async (route) => {
        posted = route.request().postDataJSON();
        await route.fulfill(json({ ...capturedReport, reportId }));
      });

      const popup = await openPopup();
      await expect(popup.locator("#page-title")).toHaveText("Team dashboard");
      await expect(popup.locator("#page-address")).toHaveText("app.example.test/dashboard");

      const opened = context.waitForEvent("page");
      await popup.getByRole("button", { name: "Explain this page" }).dispatchEvent("click");
      const site = await opened;

      // No confirm step: the click in the extension was the go-ahead.
      await expect(site).toHaveURL(new RegExp(`/report/${reportId}$`));
      await expect(site.getByText("Captured from your browser.")).toBeVisible();
      await expect(site.getByText("Only you can open this report.")).toBeVisible();

      expect(posted).not.toBeNull();
      expect(posted!.url).toBe(APP_PAGE);
      expect(posted!.source).toBe("browser");
      expect(String(posted!.html)).toContain("You have 3 open invoices.");
      // Only the headers the report uses leave the browser. Cookies never do.
      expect(posted!.headers).toEqual({ "x-frame-options": "DENY", "x-powered-by": "Express" });
      expect(typeof (posted!.timings as { requests?: number }).requests).toBe("number");
    } finally {
      await cleanup();
    }
  });

  test("a signed-out visitor is asked to sign in, and nothing is sent", async ({ baseURL }) => {
    const { context, openPopup, cleanup } = await launchWithExtension(baseURL!, false);
    try {
      let posts = 0;
      await context.route("**/api/analyze-capture", (route) => { posts += 1; return route.fulfill(json({ error: "sign in" }, 401)); });

      const popup = await openPopup();
      const opened = context.waitForEvent("page");
      await popup.getByRole("button", { name: "Explain this page" }).dispatchEvent("click");
      const site = await opened;

      await expect(site.getByRole("heading", { name: "Analyze this page?" })).toBeVisible();
      await expect(site.getByText("app.example.test/dashboard")).toBeVisible();
      await expect(site.getByText("The page as your browser shows it")).toBeVisible();
      await expect(site.getByRole("link", { name: "Sign in to analyze" })).toBeVisible();
      await expect(site).toHaveURL(/\/capture$/);
      expect(posts).toBe(0);
    } finally {
      await cleanup();
    }
  });

  test("the second button starts the normal analysis of the public address", async ({ baseURL }) => {
    const { context, openPopup, cleanup } = await launchWithExtension(baseURL!, true);
    try {
      const popup = await openPopup();
      const opened = context.waitForEvent("page");
      await popup.getByRole("button", { name: "Analyze the public address" }).dispatchEvent("click");
      const site = await opened;

      // The ordinary report for that address: shareable and re-runnable, not
      // the private kind a captured page gets.
      await expect(site.getByText("app.example.test").first()).toBeVisible();
      await expect(site.getByRole("button", { name: "Re-run fresh" })).toBeVisible({ timeout: 20_000 });
      await expect(site.getByText("Only you can open this report.")).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });
});
