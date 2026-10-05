import { expect, test } from "@playwright/test";
import { declineConsent, installApiFallback, mockJson } from "./fixtures";

// WAVE (wave.webaim.org) reports these two on the landing page even when axe
// is clean: decorative SVGs with no accessible name ("Missing alternative
// text") and text smaller than 11px ("Very small text").
test.describe("WAVE rules on the landing page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiFallback(page);
    await mockJson(page, "/api/usage", { plan: "free", dailyLimit: 5, dailyUsed: 0, dailyRemaining: 5 });
    await page.goto("/");
    await declineConsent(page);
  });

  test("every SVG is hidden from assistive tech or has a name", async ({ page }) => {
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("svg")]
        .filter((s) => !s.closest('[aria-hidden="true"]') && !s.getAttribute("aria-label") && !s.querySelector("title"))
        .map((s) => `${s.parentElement?.tagName.toLowerCase()}: ${s.parentElement?.textContent?.trim().slice(0, 40)}`),
    );
    expect(unnamed, "SVGs without aria-hidden, aria-label or <title>").toEqual([]);
  });

  test("no visible text is smaller than 11px", async ({ page }) => {
    const small = await page.evaluate(() => {
      const found: string[] = [];
      const seen = new Set<Element>();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const el = node.parentElement;
        if (!el || !node.textContent?.trim() || seen.has(el)) continue;
        seen.add(el);
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || el.getClientRects().length === 0) continue;
        if (parseFloat(cs.fontSize) < 11) found.push(`${cs.fontSize} "${node.textContent.trim().slice(0, 30)}"`);
      }
      return found;
    });
    expect(small, "text under 11px").toEqual([]);
  });
});
