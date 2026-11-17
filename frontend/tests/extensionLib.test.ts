// The Chrome extension lives in /extension, outside this app. Its pure helpers
// and its manifest are checked here so they run with the rest of the tests.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module with no type declarations
import { describeTab, handoverUrl, publicAnalysisUrl } from "../../extension/lib.js";

const SITE = "https://www.explainthiswebsite.com";
const extensionDir = path.resolve(import.meta.dirname, "../../extension");

describe("describeTab", () => {
  it("accepts a normal web page and shows its address without query or hash", () => {
    expect(describeTab({ url: "https://app.example.com/team?tab=2#members", title: " Team " }, SITE)).toEqual({
      kind: "ready",
      url: "https://app.example.com/team?tab=2#members",
      title: "Team",
      address: "app.example.com/team",
    });
    expect(describeTab({ url: "http://localhost:3000/", title: "" }, SITE)).toMatchObject({ kind: "ready", address: "localhost:3000" });
  });

  it("refuses browser pages, files, the Web Store and tabs with no address", () => {
    for (const url of ["chrome://extensions", "file:///Users/me/page.html", "https://chromewebstore.google.com/detail/x", "about:blank", "", undefined]) {
      expect(describeTab({ url }, SITE)).toEqual({ kind: "unsupported" });
    }
    expect(describeTab(undefined, SITE)).toEqual({ kind: "unsupported" });
  });

  it("recognizes the site itself", () => {
    expect(describeTab({ url: `${SITE}/pricing` }, SITE)).toEqual({ kind: "own-site" });
  });
});

describe("links into the site", () => {
  it("starts a public analysis without the page's hash", () => {
    expect(publicAnalysisUrl(SITE, "https://example.com/a b?q=1#top")).toBe(`${SITE}/?url=${encodeURIComponent("https://example.com/a%20b?q=1")}`);
  });

  it("opens the capture page marked as coming from the extension", () => {
    expect(handoverUrl(SITE)).toBe(`${SITE}/capture?from=extension`);
  });
});

describe("the extension's manifest", () => {
  const manifest = JSON.parse(readFileSync(path.join(extensionDir, "manifest.json"), "utf8"));

  it("asks for the current tab only, never for every website", () => {
    expect(manifest.permissions).toEqual(["activeTab", "scripting", "storage"]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_host_permissions).toBeUndefined();
  });

  it("runs its own script on the site's capture page and nowhere else", () => {
    expect(manifest.content_scripts).toHaveLength(1);
    expect(manifest.content_scripts[0].matches).toEqual([`${SITE}/capture*`]);
  });

  it("points at the same site as the extension's config", () => {
    expect(readFileSync(path.join(extensionDir, "config.js"), "utf8")).toContain(`"${SITE}"`);
  });

  it("has no em dashes in anything people read", () => {
    for (const file of ["manifest.json", "popup.html", "popup.js", "read-page.js", "background.js"]) {
      expect(readFileSync(path.join(extensionDir, file), "utf8"), file).not.toContain("—");
    }
  });
});
