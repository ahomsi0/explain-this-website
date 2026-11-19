import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES } from "../src/guides/guides";
import { metaForPath, publicPaths, serializeJsonLd, shellMeta } from "../src/seo/routes";
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
    expect(html).toContain("<title>Largest Contentful Paint (LCP): What It Is and How to Fix It</title>");
    expect(html).toContain('<link rel="canonical" href="https://www.explainthiswebsite.com/guides/lcp" />');
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain('<meta property="og:type" content="article" />');
  });

  it("declares its language: self hreflang, x-default and og:locale", () => {
    const url = "https://www.explainthiswebsite.com/guides/lcp";
    expect(html).toContain(`<link rel="alternate" hreflang="en" href="${url}" />`);
    expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${url}" />`);
    expect(html).toContain('<meta property="og:locale" content="en_US" />');
  });

  it("embeds the four JSON-LD blocks, FAQ included", () => {
    expect(html.match(/<script type="application\/ld\+json">/g)).toHaveLength(4);
  });

  it("puts the guide content inside #root", () => {
    const root = html.split('<div id="root">')[1].split("</div></body>")[0];
    expect(root).toContain("<h1>Largest Contentful Paint (LCP): What It Is and How to Fix It</h1>");
    for (const step of GUIDES["lcp"].steps) expect(root).toContain(escapeHtml(step));
  });

  it("puts the deep-dive sections and questions in the static copy", () => {
    const root = html.split('<div id="root">')[1].split("</div></body>")[0];
    for (const sec of GUIDES["lcp"].deepDive ?? []) expect(root).toContain(`<h2>${escapeHtml(sec.heading)}</h2>`);
    expect(root).toContain("<h2>Common questions</h2>");
    for (const f of GUIDES["lcp"].faq ?? []) {
      expect(root).toContain(`<h3>${escapeHtml(f.q)}</h3>`);
      expect(root).toContain(escapeHtml(f.a));
    }
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

  it("gives every URL en and x-default alternates pointing at itself", () => {
    const entries = xml.split("<url>").slice(1);
    expect(entries).toHaveLength(publicPaths().length);
    for (const entry of entries) {
      const loc = entry.match(/<loc>(.*?)<\/loc>/)![1];
      expect(entry).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${loc}" />`);
      expect(entry).toContain(`<xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />`);
    }
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
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

  it("rewrites only client-side routes to the noindex SPA shell; everything else falls through to 404.html", () => {
    const vercel = JSON.parse(read("vercel.json"));
    type Rewrite = { source: string; destination: string; has?: { type: string; key: string; value: string }[] };
    const [crawlers, ...rest] = vercel.rewrites as Rewrite[];

    // First rule: link-preview crawlers get the per-report preview function.
    // It must be conditional on the user agent, or every visitor would wait
    // on the API before the report page loads.
    expect(crawlers.source).toBe("/report/:id([a-f0-9]{32})");
    expect(crawlers.destination).toBe("/api/report-preview?id=:id");
    expect(crawlers.has).toHaveLength(1);
    expect(crawlers.has![0]).toMatchObject({ type: "header", key: "user-agent" });
    const crawlerUa = new RegExp(`^${crawlers.has![0].value}$`);
    for (const ua of [
      "WhatsApp/2.23.20.0",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Twitterbot/1.0",
      "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
      "TelegramBot (like TwitterBot)",
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      // iMessage previews identify as the Facebook and Twitter crawlers.
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0",
    ]) expect(ua, ua).toMatch(crawlerUa);
    for (const ua of [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
    ]) expect(ua, ua).not.toMatch(crawlerUa);

    const sources = rest.map((r) => {
      expect(r.has).toBeUndefined();
      // Reports have their own shell so a shared link previews as a report.
      expect(r.destination).toBe(r.source.startsWith("/report/") ? "/_report.html" : "/_spa.html");
      return r.source;
    });
    expect(sources).toEqual(["/report/:id([a-f0-9]{32})", "/(history|dashboard|go-pro|verify-email|login|signup|capture)"]);
    expect(sources).not.toContain("/(.*)");
    expect(metaForPath("/__spa__").robots).toBe("noindex, nofollow");
    expect(metaForPath("/404").robots).toBe("noindex, nofollow");
  });

  it("gives shared report links a real preview instead of 'Page not found'", () => {
    // Link-preview crawlers do not run JavaScript, so the shell's head is
    // the preview. It is one file for every report, so it carries no URL.
    const html = renderPage(read("index.html"), shellMeta("report"), "");
    expect(html).toContain("<title>Website audit report · Explain This Website</title>");
    expect(html).toContain('property="og:title" content="Website audit report · Explain This Website"');
    expect(html).toMatch(/property="og:description" content="A website audit from Explain This Website/);
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).not.toContain("Page not found");
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('property="og:url"');
  });

  it("keeps the general app shell neutral and unindexed", () => {
    const html = renderPage(read("index.html"), shellMeta("app"), "");
    expect(html).toContain("<title>Explain This Website</title>");
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).not.toContain("Page not found");
    expect(html).not.toContain('rel="canonical"');
  });

  it("still gives a report its own canonical once the app is running", () => {
    const id = "a".repeat(32);
    expect(metaForPath(`/report/${id}`).canonical).toBe(`https://www.explainthiswebsite.com/report/${id}`);
    expect(metaForPath(`/report/${id}`).robots).toBe("noindex, nofollow");
  });

  it("hides the static text copy in browsers that run JavaScript, without removing it", () => {
    const template = read("index.html");
    // The copy is still in the HTML for crawlers and no-JS visitors...
    const html = renderPage(template, metaForPath("/"), bodyHtmlForPath("/"));
    expect(html).toMatch(/<div id="root"><main data-prerender /);
    expect(html).toContain("<h1>Explain This Website</h1>");
    // ...and only hidden by a class that an inline script adds before first
    // paint, with a fallback that reveals it if the app never starts.
    const head = template.slice(0, template.indexOf("</head>"));
    expect(head).toContain('document.documentElement.classList.add("js")');
    expect(head).toContain("html.js [data-prerender] { display: none; }");
    expect(head).toMatch(/setTimeout\(function \(\) \{\s*if \(document\.querySelector\("\[data-prerender\]"\)\) document\.documentElement\.classList\.remove\("js"\);/);
    // Every prerendered body goes through the same wrapper.
    for (const path of ["/guides", "/guides/lcp", "/compare", "/built-with/lovable", "/404"]) {
      expect(bodyHtmlForPath(path), path).toMatch(/^<main data-prerender /);
    }
  });

  it("308-redirects the apex and the vercel.app host to the canonical www host", () => {
    const vercel = JSON.parse(read("vercel.json"));
    const hosts = vercel.redirects
      .filter((r: { permanent: boolean; destination: string; source: string }) => r.permanent && r.source === "/(.*)" && r.destination === "https://www.explainthiswebsite.com/$1")
      .flatMap((r: { has: { type: string; value: string }[] }) => r.has.filter((h) => h.type === "host").map((h) => h.value));
    expect(hosts).toEqual(["explainthiswebsite.com", "explain-this-website.vercel.app"]);
  });

  it("sends X-Robots-Tag noindex for private routes instead of blocking them in robots.txt", () => {
    const vercel = JSON.parse(read("vercel.json"));
    const sources = vercel.headers
      .filter((h: { headers: { key: string }[] }) => h.headers.some((x) => x.key === "X-Robots-Tag"))
      .map((h: { source: string }) => h.source);
    for (const s of ["/report/:path*", "/history", "/dashboard", "/go-pro", "/verify-email", "/login", "/signup", "/capture"]) expect(sources).toContain(s);
    // A Disallow would stop crawlers from ever seeing the noindex.
    expect(read("public/robots.txt")).not.toMatch(/^Disallow:\s*\S/m);
  });
});

describe("404 page", () => {
  it("is noindex and links back into the site", () => {
    const html = renderPage(TEMPLATE, metaForPath("/404"), bodyHtmlForPath("/404"));
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).toContain("<h1>Page not found</h1>");
    expect(html).toContain('href="/guides"');
  });
});
