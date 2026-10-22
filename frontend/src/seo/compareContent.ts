// Editorial content for /compare, shared by the React page and the build-time
// prerender so crawlers and visitors read the same words. Relative imports
// with `.ts` extensions only (imported by Node at build time).

export interface ContentLink {
  label: string;
  href: string;
}

export interface ContentSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: ContentLink[];
}

export const COMPARE_INTRO =
  "Enter your site and a competitor. Both are audited live, then every metric is placed side by side with the gap and the winner marked, so you can see exactly where you are behind and what to fix first.";

export const COMPARE_CONTENT: ContentSection[] = [
  {
    heading: "What gets compared",
    paragraphs: [
      "Each site runs through the same analysis the single-URL tool uses, so the comparison is apples to apples: the same checks, the same scoring, the same moment in time.",
    ],
    bullets: [
      "SEO: title and description quality, canonical tags, heading structure, image alt coverage, Open Graph tags, structured data, hreflang and sitemap presence.",
      "Performance: Google PageSpeed scores for mobile and desktop plus Core Web Vitals (LCP, CLS, TBT, Speed Index), with field data from real Chrome users where Google has it.",
      "Tech stack: CMS, framework, analytics, CDN, e-commerce platform and AI or no-code builder, with a confidence label for each.",
      "Conversion and UX: calls to action, forms, social proof, trust signals, contact details, mobile readiness, live chat and newsletter capture.",
      "Health and security: broken links, mixed content, HTTPS, security headers and a cookie or privacy policy.",
    ],
  },
  {
    heading: "How to read the result",
    paragraphs: [
      "Every row shows both values, the difference and a coloured bar on the winning side. Read it in three passes.",
    ],
    bullets: [
      "Start with the rows where you lose by the widest margin. Those are the fixes with the most headroom.",
      "Ignore rows where both sites fail. Matching a competitor's weakness is not progress, and the fix guides cover those anyway.",
      "Check the tech stack rows last. They explain why the numbers differ (a static site generator against a page builder, for instance) and tell you whether the gap is a quick fix or an architectural one.",
    ],
  },
  {
    heading: "When a side-by-side comparison helps",
    bullets: [
      "Competitor benchmarking: find out whether the site outranking you is faster, better structured or simply has more trust signals, then work the list in that order.",
      "Before and after a redesign: compare the staging URL with the live site to catch regressions in speed, metadata or accessibility before launch.",
      "Agency and freelance pitches: show a prospect their site next to their strongest competitor. Specific gaps make a better case than generic promises.",
      "Choosing a platform or builder: compare two sites built on the stacks you are considering and see how each performs in practice.",
    ],
  },
  {
    heading: "Fix the gaps you find",
    paragraphs: [
      "Every finding links to a plain-English repair guide. The ones that come up most often in comparisons:",
    ],
    links: [
      { label: "Fix slow Largest Contentful Paint (LCP)", href: "/guides/lcp" },
      { label: "Stop layout shifting (CLS)", href: "/guides/cls" },
      { label: "Add a clear call-to-action", href: "/guides/clear-cta" },
      { label: "Add trust signals", href: "/guides/trust-signals" },
      { label: "Browse all fix guides", href: "/guides" },
    ],
  },
  {
    heading: "Limits and requirements",
    bullets: [
      "A free account is required, because a comparison runs two full analyses. Daily limits are the same as for single audits.",
      "Both sites must be publicly reachable. Pages behind a login, a paywall or a bot challenge cannot be fetched.",
      "Field data (real-user Core Web Vitals) only exists for sites with enough Chrome traffic; smaller sites show lab data only.",
      "Results reflect the two pages you enter, usually the home pages. Compare specific landing pages when those are what you compete on.",
    ],
  },
];
