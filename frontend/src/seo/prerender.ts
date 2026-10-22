// Pure string builders for the build-time prerender (scripts/prerender.mjs).
// Imported directly by Node: relative `.ts` imports only.
import { CATEGORY_ORDER, GUIDES, relatedGuides } from "../guides/guides.ts";
import type { Guide } from "../guides/guides.ts";
import { BUILDERS, buildersOfKind, displayName, relatedBuilders } from "../builders/builders.ts";
import type { Builder } from "../builders/builders.ts";
import { COMPARE_CONTENT, COMPARE_INTRO } from "./compareContent.ts";
import type { ContentSection } from "./compareContent.ts";
import {
  OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  builderTitle,
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
  const related = relatedGuides(guide)
    .map((g) => `<li><a href="/guides/${g.slug}">${escapeHtml(g.title)}</a>: ${escapeHtml(g.summary)}</li>`)
    .join("");
  const mistakes = guide.commonMistakes?.length
    ? `<h2>Common mistakes</h2><ul>${guide.commonMistakes.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`
    : "";
  const verify = guide.howToVerify ? `<h2>How to check it worked</h2><p>${escapeHtml(guide.howToVerify)}</p>` : "";
  return main(
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/guides">Fix guides</a></nav>` +
      `<h1>${escapeHtml(guide.title)}</h1>` +
      `<p>${escapeHtml(guide.summary)}</p>` +
      `<h2>What it means</h2><p>${escapeHtml(guide.whatItMeans)}</p>` +
      `<h2>Why it matters</h2><p>${escapeHtml(guide.whyItMatters)}</p>` +
      `<h2>How to fix it</h2><ol>${steps}</ol>` +
      mistakes +
      verify +
      tools +
      `<p>Not sure if this affects your site? <a href="/">Analyze your website for free</a> or <a href="/compare">compare it with a competitor</a>.</p>` +
      (related ? `<h2>Related guides</h2><ul>${related}</ul>` : "") +
      `<p><a href="/guides">Browse all ${Object.keys(GUIDES).length} fix guides</a></p>`,
  );
}

const li = (items: string[]) => items.map((t) => `<li>${escapeHtml(t)}</li>`).join("");

function builderLinksHtml(builders: Builder[]): string {
  return `<ul>${builders
    .map((b) => `<li><a href="/built-with/${b.slug}">${escapeHtml(displayName(b))}</a>: ${escapeHtml(b.summary)}</li>`)
    .join("")}</ul>`;
}

export const BUILT_WITH_INTRO =
  "Paste a URL into the analyzer and the Overview card tells you when a site was made with one of 21 AI or no-code website builders. This page explains what that badge means, how the detection works and how to check a site yourself.";

export const HOW_DETECTION_WORKS = [
  "The analyzer fetches the page and searches the raw HTML for each builder's public fingerprints: the hosting domains it publishes to (such as lovable.app or framerusercontent.com) and the value of the <meta name=\"generator\"> tag that many builders write into the head.",
  "A match on any fingerprint reports the builder with high confidence. Phrases such as \"powered by AI\" with no builder fingerprint report \"AI-assisted\" with medium confidence and no name.",
  "Nothing is guessed from design, copy style or page structure. If the HTML does not reference the builder, the analyzer says nothing about it.",
];

export const DETECTION_LIMITS = [
  "A site on a custom domain whose owner removed every reference to the builder is not detected. This is common for code-generation tools such as Lovable or Bolt once a developer takes the code elsewhere.",
  "Editors such as Cursor and Windsurf produce ordinary code. They are only reported when a page explicitly declares them in a generator tag.",
  "Only the fetched page is inspected, usually the home page. A builder used for one landing page on a larger site will not show up when you analyze the home page.",
  "Detection is a statement about the HTML, not a judgement about quality. Several of these builders produce faster, better-structured pages than many hand-built sites.",
];

export function builtWithHubBodyHtml(): string {
  return main(
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> › Built with</nav>` +
      `<h1>What is this website built with?</h1>` +
      `<p>${escapeHtml(BUILT_WITH_INTRO)}</p>` +
      `<p><a href="/">Analyze a website now</a> to see its builder, tech stack, SEO audit and performance in one report.</p>` +
      `<h2>How detection works</h2><ul>${li(HOW_DETECTION_WORKS)}</ul>` +
      `<h2>AI website builders we detect</h2>${builderLinksHtml(buildersOfKind("ai"))}` +
      `<h2>No-code website builders we detect</h2>${builderLinksHtml(buildersOfKind("no-code"))}` +
      `<h2>What it cannot detect</h2><ul>${li(DETECTION_LIMITS)}</ul>` +
      `<p>Already know the builder and want to fix what the audit found? <a href="/guides">Browse the fix guides</a> or <a href="/compare">compare two sites side by side</a>.</p>`,
  );
}

export function builderBodyHtml(builder: Builder): string {
  const name = displayName(builder);
  const related = relatedBuilders(builder)
    .map((b) => `<li><a href="/built-with/${b.slug}">${escapeHtml(builderTitle(b))}</a></li>`)
    .join("");
  return main(
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/built-with">Built with</a></nav>` +
      `<h1>${escapeHtml(builderTitle(builder))}</h1>` +
      `<p>${escapeHtml(builder.summary)}</p>` +
      `<p><a href="/">Paste the URL into the analyzer</a> and the Overview card shows a “Built with ${escapeHtml(name)}” badge when the page matches, alongside the full tech stack, SEO audit and performance scores.</p>` +
      `<h2>What ${escapeHtml(name)} is</h2><p>${escapeHtml(builder.whatItIs)}</p>` +
      `<h2>Signals the analyzer checks for ${escapeHtml(name)}</h2>` +
      `<p>The detector searches the page HTML for any of these strings. One match reports the builder with high confidence.</p>` +
      `<ul>${builder.signals.map((sig) => `<li><code>${escapeHtml(sig)}</code></li>`).join("")}</ul>` +
      `<h2>How to check it yourself</h2><ol>${li(builder.manualChecks)}</ol>` +
      `<h2>What ${escapeHtml(name)} sites usually show in an audit</h2><ul>${li(builder.implications)}</ul>` +
      `<p>These are tendencies from audits, not rules. <a href="/">Run the analyzer</a> on the site in question, then use the <a href="/guides">fix guides</a> for anything it flags, or <a href="/compare">compare it with a competitor</a>.</p>` +
      (related ? `<h2>Related builders</h2><ul>${related}</ul>` : "") +
      `<p><a href="/built-with">All ${Object.keys(BUILDERS).length} builders we detect</a> · <a href="${escapeHtml(builder.website)}" rel="nofollow noopener">${escapeHtml(name)} website</a></p>`,
  );
}

function contentSectionsHtml(sections: ContentSection[]): string {
  return sections
    .map((sec) => {
      const paras = (sec.paragraphs ?? []).map((t) => `<p>${escapeHtml(t)}</p>`).join("");
      const bullets = sec.bullets?.length ? `<ul>${li(sec.bullets)}</ul>` : "";
      const links = sec.links?.length
        ? `<ul>${sec.links.map((l) => `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`).join("")}</ul>`
        : "";
      return `<h2>${escapeHtml(sec.heading)}</h2>${paras}${bullets}${links}`;
    })
    .join("");
}

export function compareBodyHtml(): string {
  return main(
    `<h1>Compare two websites side by side</h1>` +
      `<p>${escapeHtml(COMPARE_INTRO)}</p>` +
      contentSectionsHtml(COMPARE_CONTENT) +
      `<p>Want to see what a site was built with first? <a href="/built-with">AI and no-code builder detection</a>.</p>`,
  );
}

export function bodyHtmlForPath(path: string): string {
  if (path.startsWith("/guides/")) {
    const slug = path.slice("/guides/".length);
    if (Object.hasOwn(GUIDES, slug)) return guideBodyHtml(GUIDES[slug]);
  }
  if (path.startsWith("/built-with/")) {
    const slug = path.slice("/built-with/".length);
    if (Object.hasOwn(BUILDERS, slug)) return builderBodyHtml(BUILDERS[slug]);
  }
  if (path === "/built-with") return builtWithHubBodyHtml();
  if (path === "/compare") return compareBodyHtml();
  if (path === "/404") {
    return main(
      `<h1>Page not found</h1><p>The page you’re looking for doesn’t exist or has moved.</p>` +
        `<p><a href="/">Analyze a website</a> · <a href="/guides">Fix guides</a> · <a href="/compare">Compare sites</a></p>`,
    );
  }
  const meta = metaForPath(path);
  const heading = path === "/" ? SITE_NAME : meta.title.replace(` · ${SITE_NAME}`, "");
  const intro = `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(meta.description)}</p>`;
  if (path === "/") {
    return main(
      `${intro}<p><a href="/compare">Compare two websites</a> · <a href="/built-with">What is a website built with?</a></p><h2>Fix guides</h2>${guideLinksHtml()}`,
    );
  }
  if (path === "/guides") {
    return main(`${intro}${guideLinksHtml()}<p>Looking for the platform behind a site? <a href="/built-with">See the AI and no-code builders we detect</a>.</p>`);
  }
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
