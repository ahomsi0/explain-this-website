// Pure string builders for the build-time prerender (scripts/prerender.mjs).
// Imported directly by Node: relative `.ts` imports only.
import { CATEGORY_ORDER, GUIDES } from "../guides/guides.ts";
import type { Guide } from "../guides/guides.ts";
import {
  OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  canonicalFor,
  metaForPath,
  publicPaths,
  serializeJsonLd,
} from "./routes.ts";
import type { PageMeta } from "./routes.ts";

const SEO_START = "<!--seo:start-->";
const SEO_END = "<!--seo:end-->";
const ROOT_EMPTY = '<div id="root"></div>';

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The SEO head tags for a page. The marked block in index.html must equal this for "/" (see tests). */
export function seoHeadHtml(meta: PageMeta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const c = escapeHtml(meta.canonical);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta name="robots" content="${meta.robots}" />`,
    `<link rel="canonical" href="${c}" />`,
    `<link rel="alternate" hreflang="en" href="${c}" />`,
    `<link rel="alternate" hreflang="x-default" href="${c}" />`,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:url" content="${c}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    ...meta.jsonLd.map((data) => `<script type="application/ld+json">${serializeJsonLd(data)}</script>`),
  ].join("\n    ");
}

export function renderPage(template: string, meta: PageMeta, bodyHtml: string): string {
  if (!template.includes(SEO_START) || !template.includes(SEO_END) || !template.includes(ROOT_EMPTY)) {
    throw new Error(`Template needs ${SEO_START}…${SEO_END} markers and an empty <div id="root">`);
  }
  return template
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, () => `${SEO_START}\n    ${seoHeadHtml(meta)}\n    ${SEO_END}`)
    .replace(ROOT_EMPTY, () => `<div id="root">${bodyHtml}</div>`);
}

// Static content shown to crawlers (and for a split second to humans, until
// React's createRoot replaces it). Inline colours match the dark app background.
const MAIN_STYLE =
  "max-width:48rem;margin:0 auto;padding:6rem 1.5rem 3rem;color:#e4e4e7;font-family:Inter,system-ui,sans-serif;line-height:1.6";

const main = (inner: string) => `<main style="${MAIN_STYLE}">${inner}</main>`;

function guideLinksHtml(): string {
  return CATEGORY_ORDER.map((category) => {
    const items = Object.values(GUIDES)
      .filter((g) => g.category === category)
      .map((g) => `<li><a href="/guides/${g.slug}">${escapeHtml(g.title)}</a>: ${escapeHtml(g.summary)}</li>`)
      .join("");
    return items ? `<h2>${escapeHtml(category)}</h2><ul>${items}</ul>` : "";
  }).join("");
}

export function guideBodyHtml(guide: Guide): string {
  const steps = guide.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  const tools = guide.tools?.length
    ? `<h2>Helpful tools</h2><ul>${guide.tools.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
    : "";
  const related = Object.values(GUIDES)
    .filter((g) => g.category === guide.category && g.slug !== guide.slug)
    .slice(0, 3)
    .map((g) => `<li><a href="/guides/${g.slug}">${escapeHtml(g.title)}</a></li>`)
    .join("");
  return main(
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/guides">Fix guides</a></nav>` +
      `<h1>${escapeHtml(guide.title)}</h1>` +
      `<p>${escapeHtml(guide.summary)}</p>` +
      `<h2>What it means</h2><p>${escapeHtml(guide.whatItMeans)}</p>` +
      `<h2>Why it matters</h2><p>${escapeHtml(guide.whyItMatters)}</p>` +
      `<h2>How to fix it</h2><ol>${steps}</ol>` +
      tools +
      (related ? `<h2>Related guides</h2><ul>${related}</ul>` : ""),
  );
}

export function bodyHtmlForPath(path: string): string {
  if (path.startsWith("/guides/")) {
    const slug = path.slice("/guides/".length);
    if (Object.hasOwn(GUIDES, slug)) return guideBodyHtml(GUIDES[slug]);
  }
  const meta = metaForPath(path);
  const heading = path === "/" ? SITE_NAME : meta.title.replace(` · ${SITE_NAME}`, "");
  const intro = `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(meta.description)}</p>`;
  if (path === "/") return main(`${intro}<p><a href="/compare">Compare two websites</a></p><h2>Fix guides</h2>${guideLinksHtml()}`);
  if (path === "/guides") return main(`${intro}${guideLinksHtml()}`);
  // Legal, status, compare and what's-new bodies are rendered by React; the
  // static copy only needs a heading and summary so the page is never empty.
  return main(`${intro}<p><a href="/">Analyze a website</a> · <a href="/guides">Fix guides</a></p>`);
}

export function buildSitemap(lastmodFor: (path: string) => string | null): string {
  const urls = publicPaths()
    .map((p) => {
      const lastmod = lastmodFor(p);
      const loc = canonicalFor(p);
      const alternates =
        `\n    <xhtml:link rel="alternate" hreflang="en" href="${loc}" />` +
        `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />`;
      return `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}${alternates}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export function outFileFor(path: string): string {
  return path === "/" ? "index.html" : `${path.slice(1)}/index.html`;
}

export { SITE_URL };
