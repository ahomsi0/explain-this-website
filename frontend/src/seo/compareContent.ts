// Editorial content for /compare, shared by the React page and the build-time
// prerender so crawlers and visitors read the same words. Relative imports
// with `.ts` extensions only (imported by Node at build time).

export interface ContentLink {
  label: string;
  href: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface ContentSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Render the bullets as a numbered list. */
  ordered?: boolean;
  links?: ContentLink[];
  faq?: FaqItem[];
}

export const COMPARE_TITLE = "Compare two websites’ SEO side by side";

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
    heading: "How to compare your website with a competitor",
    ordered: true,
    bullets: [
      "Pick the right competitor: the site that ranks above you for the search you care about, not the biggest name in your industry. Search the phrase in a private window and take the result just above yours.",
      "Compare like with like. Put your page against the page that outranks it: home page against home page, product page against product page. A home page against a blog post tells you little.",
      "Start with the SEO basics: page title, meta description, one clear H1 and structured data. They are quick to fix, and a missing one is a common reason a competitor wins.",
      "Then compare speed on mobile. Most searches happen on phones, and the Core Web Vitals gap between two sites is often wider there than on desktop.",
      "Look at trust and conversion signals last: reviews, contact details and a clear call to action. They decide whether a visit turns into a customer once you have earned the click.",
      "Fix the widest gaps first, give Google a few weeks to crawl the changes, then run the comparison again to confirm the gap has closed.",
    ],
  },
  {
    heading: "Which SEO factors matter most in a comparison",
    paragraphs: [
      "Not every row weighs the same. Read the gaps in this order.",
    ],
    bullets: [
      "Relevance first. If the competitor's page answers the search better, with more depth, clearer headings and the words people actually search for, no technical fix closes that gap. Read both pages as a visitor before reading the numbers.",
      "Indexability next. A noindex tag, a canonical pointing elsewhere or a blocked page can keep a site out of results entirely. These rows are pass or fail, and a fail outweighs everything else.",
      "Titles and descriptions decide whether people click once Google shows you.",
      "Speed and Core Web Vitals work like a tie-breaker between pages that are equally relevant.",
      "Structured data does not raise rankings by itself, but it can earn rich results that take up more space on the results page.",
    ],
  },
  {
    heading: "Can it compare search rankings?",
    paragraphs: [
      "Not directly. The comparison shows the on-page factors behind rankings, not where each site appears for a given search. Positions change with location, device and search history, so any single number is an estimate.",
      "For your own site, Google Search Console shows the average position for every search you appear in, for free. For a competitor, search the phrase in a private window or use a rank tracker. Use those to see where each site ranks, and this comparison to find out why.",
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
  {
    heading: "Common questions",
    faq: [
      {
        q: "Is the website comparison free?",
        a: "Yes. You need a free account, and no card is asked for. Each comparison runs a full analysis of both sites.",
      },
      {
        q: "Can I compare more than two websites?",
        a: "Not in one run. Compare your site with each competitor in turn; the strongest one usually tells you the most.",
      },
      {
        q: "Can I compare two specific pages instead of home pages?",
        a: "Yes. Enter any public address on either side, such as a product page, a landing page or an article.",
      },
      {
        q: "Why do the speed scores change between runs?",
        a: "Each run loads both pages for real, and server response, network conditions and third-party scripts vary from one load to the next. A few points either way is normal, so run it again before acting on a small gap.",
      },
    ],
  },
];
