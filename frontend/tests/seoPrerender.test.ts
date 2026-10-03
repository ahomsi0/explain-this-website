import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES } from "../src/guides/guides";
import { metaForPath, publicPaths, serializeJsonLd } from "../src/seo/routes";
import {
  bodyHtmlForPath,
  buildSitemap,
  escapeHtml,
  outFileFor,
  renderPage,
} from "../src/seo/prerender";

const TEMPLATE =
  '<html><head><!--seo:start-->OLD<!--seo:end--><script src="/a.js"></script></head><body><div id="root"></div></body></html>';

describe("renderPage", () => {
  const path = "/guides/lcp";
  const html = renderPage(TEMPLATE, metaForPath(path), bodyHtmlForPath(path));

  it("replaces the marked head block and keeps the rest of the template", () => {
    expect(html).not.toContain("OLD");
    expect(html).toContain('<script src="/a.js"></script>');
    expect(html).toContain("<title>Fix slow Largest Contentful Paint (LCP) · Explain This Website</title>");
    expect(html).toContain('<link rel="canonical" href="https://www.explainthiswebsite.com/guides/lcp" />');
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain('<meta property="og:type" content="article" />');
  });

  it("embeds the three JSON-LD blocks", () => {
    expect(html.match(/<script type="application\/ld\+json">/g)).toHaveLength(3);
  });

  it("puts the guide content inside #root", () => {
    const root = html.split('<div id="root">')[1].split("</div></body>")[0];
    expect(root).toContain("<h1>Fix slow Largest Contentful Paint (LCP)</h1>");
    for (const step of GUIDES["lcp"].steps) expect(root).toContain(escapeHtml(step));
  });

  it("throws when the template lacks the markers or the root", () => {
    expect(() => renderPage("<html></html>", metaForPath("/"), "")).toThrow();
  });
});

describe("escapeHtml / JSON-LD safety", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
  it("never emits a closing script tag from JSON-LD", () => {
    expect(serializeJsonLd({ t: "</script>" })).not.toContain("</script>");
  });
});

describe("bodyHtmlForPath", () => {
  it("gives every public path a heading and non-trivial content", () => {
    for (const p of publicPaths()) {
      const body = bodyHtmlForPath(p);
      expect(body, p).toContain("<h1");
      expect(body.length, p).toBeGreaterThan(150);
    }
  });

  it("links the home page and guides index to every guide", () => {
    for (const p of ["/", "/guides"]) {
      const body = bodyHtmlForPath(p);
      for (const slug of Object.keys(GUIDES)) expect(body, `${p} -> ${slug}`).toContain(`href="/guides/${slug}"`);
    }
  });
});

describe("buildSitemap", () => {
  const xml = buildSitemap((p) => (p.startsWith("/guides/") ? "2026-10-03" : null));

  it("lists every public URL exactly once, with lastmod only where one is given", () => {
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toHaveLength(publicPaths().length);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toContain("https://www.explainthiswebsite.com/");
    expect(locs).toContain("https://www.explainthiswebsite.com/guides/sitemap");
    expect(xml.match(/<lastmod>2026-10-03<\/lastmod>/g)).toHaveLength(Object.keys(GUIDES).length);
  });

  it("omits the ignored changefreq/priority hints and private pages", () => {
    expect(xml).not.toContain("changefreq");
    expect(xml).not.toContain("priority");
    expect(xml).not.toContain("/history");
    expect(xml).not.toContain("/dashboard");
  });
});

describe("outFileFor", () => {
  it("maps routes to dist files", () => {
    expect(outFileFor("/")).toBe("index.html");
    expect(outFileFor("/guides")).toBe("guides/index.html");
    expect(outFileFor("/guides/lcp")).toBe("guides/lcp/index.html");
  });
});

describe("hosting config", () => {
  const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");

  it("rewrites unknown URLs to the noindex SPA shell, not the home page", () => {
    const vercel = JSON.parse(read("vercel.json"));
    expect(vercel.rewrites).toEqual([{ source: "/(.*)", destination: "/_spa.html" }]);
    expect(metaForPath("/__spa__").robots).toBe("noindex, nofollow");
  });

  it("sends X-Robots-Tag noindex for private routes instead of blocking them in robots.txt", () => {
    const vercel = JSON.parse(read("vercel.json"));
    const sources = vercel.headers
      .filter((h: { headers: { key: string }[] }) => h.headers.some((x) => x.key === "X-Robots-Tag"))
      .map((h: { source: string }) => h.source);
    for (const s of ["/report/:path*", "/history", "/dashboard", "/go-pro", "/verify-email"]) expect(sources).toContain(s);
    // A Disallow would stop crawlers from ever seeing the noindex.
    expect(read("public/robots.txt")).not.toMatch(/^Disallow:\s*\S/m);
  });
});
