import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILDERS, BUILDER_ORDER, builderSlugForName, buildersOfKind, displayName } from "../src/builders/builders";
import { builderTitle, metaForPath, publicPaths } from "../src/seo/routes";
import { bodyHtmlForPath, escapeHtml } from "../src/seo/prerender";

/** Parses `aiBuilderPatterns` out of the Go source so the public copy can never drift from the detector. */
function backendPatterns(): Record<string, string[]> {
  const go = readFileSync(resolve(process.cwd(), "../backend/internal/parser/tech.go"), "utf8");
  const block = go.match(/var aiBuilderPatterns = \[\]aiBuilderPattern\{([\s\S]*?)\n\}/)?.[1];
  expect(block, "aiBuilderPatterns not found in tech.go").toBeDefined();
  const out: Record<string, string[]> = {};
  for (const m of block!.matchAll(/\{name: "([^"]+)", patterns: \[\]string\{([^}]*)\}\}/g)) {
    const patterns = [...m[2].matchAll(/"([^"]*)"|`([^`]*)`/g)].map((p) => p[1] ?? p[2]);
    out[m[1]] = patterns;
  }
  return out;
}

describe("builders catalog", () => {
  const backend = backendPatterns();

  it("covers every builder the backend detects, with identical signals, and nothing else", () => {
    const names = BUILDER_ORDER.map((s) => BUILDERS[s].name).sort();
    expect(names).toEqual(Object.keys(backend).sort());
    for (const slug of BUILDER_ORDER) {
      const b = BUILDERS[slug];
      expect(b.signals, b.name).toEqual(backend[b.name]);
      expect(b.slug).toBe(slug);
    }
  });

  it("has substantive, unique copy for every builder", () => {
    const seen = new Set<string>();
    for (const slug of BUILDER_ORDER) {
      const b = BUILDERS[slug];
      expect(b.whatItIs.length, slug).toBeGreaterThan(150);
      expect(b.manualChecks.length, slug).toBeGreaterThanOrEqual(3);
      expect(b.implications.length, slug).toBeGreaterThanOrEqual(3);
      expect(b.summary.length, slug).toBeGreaterThan(40);
      expect(seen.has(b.whatItIs), slug).toBe(false);
      seen.add(b.whatItIs);
      for (const r of b.relatedSlugs) expect(Object.hasOwn(BUILDERS, r), `${slug} -> ${r}`).toBe(true);
      expect(b.relatedSlugs).not.toContain(slug);
      expect(b.website).toMatch(/^https:\/\//);
    }
  });

  it("labels only prompt-to-site products as AI builders", () => {
    const ai = buildersOfKind("ai").map((b) => b.slug);
    expect(ai).toContain("lovable");
    expect(ai).toContain("v0");
    expect(ai).not.toContain("carrd");
    expect(ai).not.toContain("godaddy-website-builder");
    expect(ai.length + buildersOfKind("no-code").length).toBe(BUILDER_ORDER.length);
  });

  it("maps the backend badge name to a page slug", () => {
    expect(builderSlugForName("Bolt (StackBlitz)")).toBe("bolt");
    expect(builderSlugForName("Lovable")).toBe("lovable");
    expect(builderSlugForName("")).toBeNull();
    expect(builderSlugForName("Unknown Builder")).toBeNull();
  });
});

describe("built-with pages (SEO)", () => {
  it("are all public and indexable with article metadata", () => {
    const paths = publicPaths();
    expect(paths).toContain("/built-with");
    for (const slug of BUILDER_ORDER) {
      const path = `/built-with/${slug}`;
      expect(paths).toContain(path);
      const meta = metaForPath(path);
      expect(meta.robots).toBe("index, follow");
      expect(meta.ogType).toBe("article");
      expect(meta.title).toContain(displayName(BUILDERS[slug]));
      expect(meta.title.length, path).toBeLessThanOrEqual(70);
      expect(meta.jsonLd.map((o) => o["@type"])).toEqual(["Article", "BreadcrumbList"]);
    }
  });

  it("marks unknown builders noindex", () => {
    expect(metaForPath("/built-with/wix").robots).toBe("noindex, nofollow");
    expect(metaForPath("/built-with/constructor").robots).toBe("noindex, nofollow");
  });

  it("prerenders the full copy and the exact signals for each builder", () => {
    for (const slug of BUILDER_ORDER) {
      const b = BUILDERS[slug];
      const body = bodyHtmlForPath(`/built-with/${slug}`);
      expect(body).toContain(`<h1>${escapeHtml(builderTitle(b))}</h1>`);
      for (const sig of b.signals) expect(body, `${slug} signal`).toContain(`<code>${escapeHtml(sig)}</code>`);
      for (const step of b.manualChecks) expect(body).toContain(escapeHtml(step));
      expect(body).toContain('href="/built-with"');
      expect(body).toContain('href="/"');
    }
  });

  it("links the hub to every builder and the home page and guides index to the hub", () => {
    const hub = bodyHtmlForPath("/built-with");
    for (const slug of BUILDER_ORDER) expect(hub).toContain(`href="/built-with/${slug}"`);
    expect(bodyHtmlForPath("/")).toContain('href="/built-with"');
    expect(bodyHtmlForPath("/guides")).toContain('href="/built-with"');
  });

  it("gives the compare page real content and a link to the hub", () => {
    const body = bodyHtmlForPath("/compare");
    expect(body).toContain("<h1>Compare two websites side by side</h1>");
    expect(body).toContain("<h2>What gets compared</h2>");
    expect(body).toContain('href="/guides/lcp"');
    expect(body).toContain('href="/built-with"');
    expect(body.length).toBeGreaterThan(3000);
  });
});
