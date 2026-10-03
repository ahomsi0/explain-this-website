// Single source of truth for per-page SEO. Imported by the runtime hook
// (usePageMeta) AND by the build-time prerender script (Node imports this file
// directly), so: relative imports with `.ts` extensions only, no `@/` alias.
import { GUIDES } from "../guides/guides.ts";
import type { Guide } from "../guides/guides.ts";

export const SITE_URL = "https://www.explainthiswebsite.com";
export const SITE_NAME = "Explain This Website";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
export const INDEXABLE = "index, follow";
export const NOINDEX = "noindex, nofollow";

export type JsonLd = Record<string, unknown>;

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: "website" | "article";
  jsonLd: JsonLd[];
}

interface StaticPage {
  title: string;
  description: string;
  indexable: boolean;
}

const withSite = (title: string) => `${title} · ${SITE_NAME}`;

const HOME_TITLE = "Explain This Website — Instant Website Analyzer";
const HOME_DESCRIPTION =
  "Paste any URL and get an instant analysis: tech stack detection, SEO audit, UX signals, conversion score, and actionable recommendations. Free, no login required.";

const STATIC_PAGES: Record<string, StaticPage> = {
  "/": { title: HOME_TITLE, description: HOME_DESCRIPTION, indexable: true },
  "/guides": {
    title: withSite("Website Fix Guides"),
    description:
      "Plain-English, step-by-step guides for fixing what a website audit finds: page speed, SEO, conversion, security and content.",
    indexable: true,
  },
  "/compare": {
    title: withSite("Compare Sites"),
    description:
      "Analyze two websites at once and compare tech stack, SEO, performance and conversion signals side by side. Free, no login required.",
    indexable: true,
  },
  "/whats-new": {
    title: withSite("What’s New"),
    description: "The latest features, fixes and improvements to the Explain This Website analyzer.",
    indexable: true,
  },
  "/status": {
    title: withSite("Service Status"),
    description: "Live status of the Explain This Website analyzer and the services it depends on.",
    indexable: true,
  },
  "/privacy": {
    title: withSite("Privacy Policy"),
    description: "How Explain This Website collects, uses and protects your data when you analyze a website.",
    indexable: true,
  },
  "/terms": {
    title: withSite("Terms of Service"),
    description: "The terms that apply when you use the Explain This Website analyzer and its reports.",
    indexable: true,
  },
  "/history": { title: withSite("Audit History"), description: "Your past website audits.", indexable: false },
  "/go-pro": { title: withSite("Go Pro"), description: "Upgrade to Pro for higher analysis limits.", indexable: false },
  "/dashboard": { title: withSite("Dashboard"), description: "Your account dashboard.", indexable: false },
  "/verify-email": { title: withSite("Verify Email"), description: "Confirm your email address.", indexable: false },
};

export function canonicalFor(path: string): string {
  return `${SITE_URL}${path}`;
}

function normalisePath(raw: string): string {
  const lower = raw.toLowerCase();
  return lower.length > 1 ? lower.replace(/\/+$/, "") || "/" : lower;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:—-]+$/, "")}…`;
}

/** JSON for an inline <script type="application/ld+json">; `<` is escaped so the payload can never close the tag. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const ORGANIZATION: JsonLd = { "@type": "Organization", name: SITE_NAME, url: SITE_URL };

function breadcrumb(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonicalFor(item.path),
    })),
  };
}

function homeJsonLd(): JsonLd[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description:
        "Paste any URL and get an instant analysis: tech stack detection, SEO audit, UX signals, conversion score, and actionable recommendations.",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Tech stack detection",
        "SEO audit",
        "UX and conversion analysis",
        "AI builder detection",
        "Page performance stats",
        "Actionable recommendations",
      ],
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${SITE_URL}/` },
    { "@context": "https://schema.org", ...ORGANIZATION },
  ];
}

function guideMeta(guide: Guide): PageMeta {
  const path = `/guides/${guide.slug}`;
  const canonical = canonicalFor(path);
  const description = truncate(`${guide.summary} ${guide.whatItMeans}`, 160);
  return {
    title: withSite(guide.title),
    description,
    canonical,
    robots: INDEXABLE,
    ogType: "article",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: guide.title,
        description,
        image: OG_IMAGE,
        mainEntityOfPage: canonical,
        author: ORGANIZATION,
        publisher: ORGANIZATION,
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: guide.title,
        description: guide.summary,
        step: guide.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Fix Guides", path: "/guides" },
        { name: guide.title, path },
      ]),
    ],
  };
}

function staticMeta(path: string, page: StaticPage): PageMeta {
  let jsonLd: JsonLd[] = [];
  if (path === "/") jsonLd = homeJsonLd();
  if (path === "/guides") jsonLd = [breadcrumb([{ name: "Home", path: "/" }, { name: "Fix Guides", path: "/guides" }])];
  return {
    title: page.title,
    description: page.description,
    canonical: canonicalFor(path),
    robots: page.indexable ? INDEXABLE : NOINDEX,
    ogType: "website",
    jsonLd: page.indexable ? jsonLd : [],
  };
}

function privateMeta(path: string, title: string): PageMeta {
  return {
    title: withSite(title),
    description: "This page is not meant to be indexed.",
    canonical: canonicalFor(path),
    robots: NOINDEX,
    ogType: "website",
    jsonLd: [],
  };
}

export function metaForPath(rawPath: string): PageMeta {
  const path = normalisePath(rawPath);
  if (Object.hasOwn(STATIC_PAGES, path)) return staticMeta(path, STATIC_PAGES[path]);
  const slug = path.match(/^\/guides\/([a-z0-9-]+)$/)?.[1];
  if (slug && Object.hasOwn(GUIDES, slug)) return guideMeta(GUIDES[slug]);
  if (path.startsWith("/report/")) return privateMeta(path, "Shared website report");
  return privateMeta(path, slug ? "Guide not found" : "Page not found");
}

/** Every indexable route: static pages flagged indexable, plus every guide. */
export function publicPaths(): string[] {
  const statics = Object.entries(STATIC_PAGES)
    .filter(([, page]) => page.indexable)
    .map(([path]) => path);
  return [...statics, ...Object.keys(GUIDES).map((slug) => `/guides/${slug}`)];
}
