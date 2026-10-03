import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES } from "../src/guides/guides";
import {
  SITE_URL,
  canonicalFor,
  metaForPath,
  publicPaths,
  serializeJsonLd,
} from "../src/seo/routes";
import { seoHeadHtml } from "../src/seo/prerender";

describe("publicPaths", () => {
  it("lists static pages and every guide exactly once", () => {
    const paths = publicPaths();
    expect(new Set(paths).size).toBe(paths.length);
    for (const slug of Object.keys(GUIDES)) expect(paths).toContain(`/guides/${slug}`);
    for (const p of ["/", "/guides", "/compare", "/whats-new", "/status", "/privacy", "/terms"]) {
      expect(paths).toContain(p);
    }
  });

  it("never lists private pages", () => {
    const paths = publicPaths();
    for (const p of ["/history", "/dashboard", "/go-pro", "/verify-email"]) {
      expect(paths).not.toContain(p);
    }
  });
});

describe("metaForPath (indexable pages)", () => {
  const paths = publicPaths();

  it("gives every page a unique title and description", () => {
    const titles = paths.map((p) => metaForPath(p).title);
    const descriptions = paths.map((p) => metaForPath(p).description);
    expect(new Set(titles).size).toBe(paths.length);
    expect(new Set(descriptions).size).toBe(paths.length);
  });

  it("keeps descriptions between 50 and 180 characters", () => {
    for (const p of paths) {
      const len = metaForPath(p).description.length;
      expect(len, p).toBeGreaterThanOrEqual(50);
      expect(len, p).toBeLessThanOrEqual(180);
    }
  });

  it("uses a self-referencing canonical and index,follow", () => {
    for (const p of paths) {
      const meta = metaForPath(p);
      expect(meta.canonical).toBe(canonicalFor(p));
      expect(meta.robots).toBe("index, follow");
    }
    expect(metaForPath("/").canonical).toBe(`${SITE_URL}/`);
    expect(metaForPath("/guides/lcp").canonical).toBe(`${SITE_URL}/guides/lcp`);
  });

  it("keeps the established titles", () => {
    expect(metaForPath("/").title).toBe("Explain This Website — Instant Website Analyzer");
    expect(metaForPath("/whats-new").title).toBe("What’s New · Explain This Website");
  });

  it("normalises case and trailing slashes", () => {
    expect(metaForPath("/Guides/LCP/").canonical).toBe(`${SITE_URL}/guides/lcp`);
  });
});

describe("metaForPath (noindex pages)", () => {
  it.each([
    "/history",
    "/dashboard",
    "/go-pro",
    "/verify-email",
    `/report/${"a".repeat(32)}`,
    "/guides/does-not-exist",
    "/guides/constructor",
    "/totally-unknown",
  ])("marks %s noindex", (path) => {
    expect(metaForPath(path).robots).toBe("noindex, nofollow");
    expect(metaForPath(path).jsonLd).toEqual([]);
  });
});

describe("JSON-LD", () => {
  it("emits Article, HowTo and BreadcrumbList for a guide", () => {
    const types = metaForPath("/guides/lcp").jsonLd.map((o) => o["@type"]);
    expect(types).toEqual(["Article", "HowTo", "BreadcrumbList"]);
    const howTo = metaForPath("/guides/lcp").jsonLd[1] as { step: unknown[] };
    expect(howTo.step).toHaveLength(GUIDES["lcp"].steps.length);
  });

  it("emits WebApplication, WebSite and Organization for the home page", () => {
    const types = metaForPath("/").jsonLd.map((o) => o["@type"]);
    expect(types).toEqual(["WebApplication", "WebSite", "Organization"]);
  });

  it("emits a BreadcrumbList for the guides index", () => {
    expect(metaForPath("/guides").jsonLd.map((o) => o["@type"])).toEqual(["BreadcrumbList"]);
  });

  it("serializes without a literal </script> sequence", () => {
    expect(serializeJsonLd({ a: "</script><b>" })).not.toContain("</script>");
  });
});

describe("index.html template", () => {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const norm = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean).join("\n");

  it("has an empty root and a marked SEO block equal to the home page head", () => {
    expect(html).toContain('<div id="root"></div>');
    const block = html.match(/<!--seo:start-->([\s\S]*?)<!--seo:end-->/)?.[1];
    expect(block, "seo markers missing in index.html").toBeDefined();
    expect(norm(block!)).toBe(norm(seoHeadHtml(metaForPath("/"))));
  });
});
