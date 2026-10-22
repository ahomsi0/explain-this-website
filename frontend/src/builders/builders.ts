// The "built with" catalog: one entry per website builder the analyzer can
// detect (backend/internal/parser/tech.go, aiBuilderPatterns). Renders the hub
// at /built-with and one page per builder at /built-with/:slug.
//
// Honesty rules for this copy:
// - `signals` must mirror the backend patterns for that builder exactly; a
//   test reads tech.go and fails if the two drift apart.
// - `implications` describe tendencies seen in audits, never guarantees.
// - "AI builder" is only used for products that generate the site from a
//   prompt; the rest are labelled no-code builders.
//
// Imported by the build-time prerender (Node): relative imports with `.ts`
// extensions only, no `@/` alias, no enums.

export type BuilderKind = "ai" | "no-code";

export interface Builder {
  slug: string;
  /** Exactly the `name` used in tech.go, so report badges can link here. */
  name: string;
  /** Short name for headings when `name` carries a qualifier, e.g. "Bolt". */
  shortName?: string;
  kind: BuilderKind;
  website: string;
  /** One line for cards and meta descriptions. */
  summary: string;
  /** What the product is and who uses it. */
  whatItIs: string;
  /** The exact HTML substrings the analyzer matches (mirrors tech.go). */
  signals: string[];
  /** Steps a person can follow in view-source or DevTools. */
  manualChecks: string[];
  /** What sites built with it commonly show in audits. */
  implications: string[];
  relatedSlugs: string[];
}

const VIEW_SOURCE =
  "Open the page, press Ctrl+U (Cmd+Option+U on a Mac) to view the source, then use Ctrl+F to search it.";

export const BUILDERS: Record<string, Builder> = {
  // ── AI builders ───────────────────────────────────────────────────────────
  lovable: {
    slug: "lovable",
    name: "Lovable",
    kind: "ai",
    website: "https://lovable.dev",
    summary: "Prompt-to-app builder that generates React front ends with Supabase back ends.",
    whatItIs:
      "Lovable turns a chat prompt into a working web app: a React and Vite front end styled with Tailwind, usually paired with a Supabase database and auth. Projects publish to a *.lovable.app subdomain by default, and many founders ship their MVP or landing page straight from it before moving to a custom domain.",
    signals: ["lovable.app", "lovable.dev", `generator" content="lovable`],
    manualChecks: [
      `${VIEW_SOURCE} Search for "lovable.app" or "lovable.dev". Generated projects often keep a default Open Graph image hosted on lovable.dev even after a custom domain is attached.`,
      "Look at the <meta name=\"generator\"> tag near the top of the head. Lovable projects that have not edited index.html declare Lovable there.",
      "Check the published URL. A site served from a *.lovable.app address was deployed from Lovable.",
      "In DevTools, open the Network tab and reload. A single large JavaScript bundle under /assets/ with hashed names and a Supabase API host (supabase.co) in the requests is the usual Lovable stack.",
    ],
    implications: [
      "The page is rendered entirely in the browser. Crawlers that do not run JavaScript see an empty root element, so titles, descriptions and headings should be verified in a prerendered or server-rendered form if search traffic matters.",
      "Default metadata is common: a title such as the project name, a placeholder description and the Lovable Open Graph image. Those appear in the analyzer's SEO section as missing or generic tags.",
      "Supabase keys are embedded in the client bundle by design. That is normal for the anon key, but any service key in the bundle is a security finding.",
      "Image weight and unused JavaScript are the usual performance flags, since generated components ship with every dependency the prompt pulled in.",
    ],
    relatedSlugs: ["bolt", "v0", "replit"],
  },
  bolt: {
    slug: "bolt",
    name: "Bolt (StackBlitz)",
    shortName: "Bolt",
    kind: "ai",
    website: "https://bolt.new",
    summary: "StackBlitz's prompt-driven app builder that runs the whole dev environment in the browser.",
    whatItIs:
      "Bolt.new, made by StackBlitz, builds full-stack JavaScript apps from a prompt and runs them inside a browser-based Node environment called WebContainers. Previews live on webcontainer.io addresses, and finished projects are typically deployed to Netlify with one click.",
    signals: ["bolt.new", "stackblitz.io", "webcontainer.io"],
    manualChecks: [
      `${VIEW_SOURCE} Search for "bolt.new", "stackblitz" or "webcontainer". Links back to the Bolt project or leftover preview URLs are the giveaway.`,
      "Check the hosting. Bolt's default deploy target is Netlify, so a *.netlify.app address combined with a Vite-built React or Next.js bundle is consistent with Bolt.",
      "Look for a 'Built with Bolt' badge or footer link, which the builder adds to some templates.",
      "In DevTools, inspect the bundle names. Vite's hashed /assets/index-*.js files with React are the default Bolt output.",
    ],
    implications: [
      "Output quality depends heavily on the prompt. Audits usually show a reasonable structure but generic metadata, because few prompts mention titles, descriptions or Open Graph tags.",
      "Most Bolt projects are single-page apps rendered in the browser, so content is invisible to crawlers that skip JavaScript unless a framework with server rendering was chosen.",
      "Dependencies accumulate as the chat goes on. Unused JavaScript and large bundles are the common performance findings.",
      "Hosting on Netlify gives HTTPS, a CDN and caching headers by default, which is why security and caching checks often pass.",
    ],
    relatedSlugs: ["lovable", "v0", "replit"],
  },
  v0: {
    slug: "v0",
    name: "v0 (Vercel)",
    shortName: "v0",
    kind: "ai",
    website: "https://v0.dev",
    summary: "Vercel's generative UI tool that produces Next.js and shadcn/ui code from a prompt.",
    whatItIs:
      "v0 is Vercel's AI builder. It generates React components and full Next.js apps styled with Tailwind and shadcn/ui, and deploys them to Vercel in a click. It started as a UI generator and now produces complete sites, which is why it shows up in audits of landing pages and dashboards.",
    signals: ["v0.dev/chat", `generator" content="v0`],
    manualChecks: [
      `${VIEW_SOURCE} Look for <meta name="generator" content="v0.app"> (older projects say v0.dev). Next.js adds this tag from the project's metadata, so it survives custom domains unless someone removed it.`,
      "Search the source for \"v0.dev/chat\". Generated pages sometimes keep a link back to the chat that produced them.",
      "Check for Next.js markers: a __next root element, /_next/static/ asset paths and a __NEXT_DATA__ script or React Server Component payload.",
      "A default description such as 'Created with v0' in the head confirms untouched v0 metadata.",
    ],
    implications: [
      "Because v0 emits Next.js, pages are usually server-rendered. Crawlers see real HTML, which is a better starting point for SEO than most AI builders.",
      "Metadata is often left at the generated default ('Created with v0'), so the analyzer flags generic titles and descriptions even when the page structure is good.",
      "shadcn/ui components ship with accessible primitives from Radix, so contrast and landmark checks tend to pass more often than on other builders.",
      "Vercel hosting provides HTTPS, HTTP/2 and image optimisation, so performance scores are usually acceptable unless large images were pasted in unoptimised.",
    ],
    relatedSlugs: ["lovable", "bolt", "cursor"],
  },
  replit: {
    slug: "replit",
    name: "Replit",
    kind: "ai",
    website: "https://replit.com",
    summary: "Cloud IDE whose Agent builds and hosts full-stack apps on *.replit.app.",
    whatItIs:
      "Replit is a browser-based development environment. Its Agent feature builds apps from a prompt, typically a Node or Python back end with a React front end, and deploys them to Replit's own hosting on *.replit.app (older projects used *.repl.co).",
    signals: [".replit.app", ".repl.co", "replit.com/@", `generator" content="replit`],
    manualChecks: [
      "Check the address. Anything served from *.replit.app or *.repl.co runs on Replit's hosting.",
      `${VIEW_SOURCE} Search for "replit.com/@", which appears in links back to the author's Replit profile or project.`,
      "Look for a <meta name=\"generator\"> tag naming Replit, present in some Agent-generated templates.",
      "In DevTools, watch the first response time. Apps on Replit's autoscale or reserved VM hosting can take a moment to wake, which shows up as a slow first byte.",
    ],
    implications: [
      "Time to first byte is the most common finding. Replit deployments that sleep between visits answer slowly on the first request, which drags LCP down in audits.",
      "Agent-built front ends are usually client-rendered React, so content depends on JavaScript and metadata is often the template default.",
      "Replit hosting serves HTTPS and HTTP/2, so transport-level security checks pass; application headers such as Content-Security-Policy are usually absent.",
      "Mixed stacks are normal: an Express or Flask API next to a Vite bundle. The analyzer's tech stack section typically lists both.",
    ],
    relatedSlugs: ["lovable", "bolt", "v0"],
  },
  cursor: {
    slug: "cursor",
    name: "Cursor",
    kind: "ai",
    website: "https://cursor.com",
    summary: "AI code editor; sites built in it are only detectable when they declare it.",
    whatItIs:
      "Cursor is an AI-assisted code editor, not a hosted site builder. A site written in Cursor is ordinary code deployed wherever the developer chose, so there is normally nothing in the HTML that points back to the editor. The analyzer only reports Cursor when the page explicitly declares it in a generator tag, which some starter templates and AI-written boilerplates do.",
    signals: [`generator" content="cursor`],
    manualChecks: [
      `${VIEW_SOURCE} Search for <meta name="generator" content="Cursor">. That tag is the only reliable public marker.`,
      "Look for comments at the top of inline scripts or styles. AI-written code sometimes carries 'Generated by Cursor' or similar notes that were never removed.",
      "Check the repository if the site is open source. A .cursorrules or .cursor/ directory in the project confirms the editor was used, even though the deployed HTML will not show it.",
      "Treat any result as low confidence. A site built in Cursor with a clean template is indistinguishable from hand-written code.",
    ],
    implications: [
      "Detection is rare and means only that the generator tag was left in place; it says nothing about the hosting or framework.",
      "Audits of these sites vary completely with the developer's choices. The useful signals are the framework and host the analyzer lists alongside the badge.",
      "A leftover generator tag is harmless for ranking, but it is a hint that other template defaults (placeholder descriptions, sample Open Graph tags) may also be untouched.",
    ],
    relatedSlugs: ["windsurf", "v0", "bolt"],
  },
  windsurf: {
    slug: "windsurf",
    name: "Windsurf",
    kind: "ai",
    website: "https://windsurf.com",
    summary: "Codeium's AI editor; detectable only through a leftover generator tag.",
    whatItIs:
      "Windsurf is an AI-native code editor from Codeium with an agent mode called Cascade. Like Cursor, it produces normal code that is deployed anywhere, so the finished site carries no built-in fingerprint. The analyzer reports Windsurf only when a page declares it in a generator meta tag.",
    signals: [`generator" content="windsurf`],
    manualChecks: [
      `${VIEW_SOURCE} Search for <meta name="generator" content="Windsurf">. Without that tag the editor cannot be identified from the page.`,
      "Scan inline scripts and comments for 'Cascade' or 'Windsurf' notes left by the agent.",
      "If the code is public, a .windsurfrules file or .windsurf/ directory in the repository confirms it.",
      "Read the result as a weak signal and rely on the framework and hosting findings for anything that matters.",
    ],
    implications: [
      "A match tells you the template defaults were not cleaned up; check titles, descriptions and Open Graph tags for placeholders in the same audit.",
      "Nothing about performance or SEO follows from the editor. The stack the analyzer identifies next to the badge is what determines the findings.",
      "Sites generated by agents in one long session often accumulate unused dependencies, which appears as unused JavaScript in the performance section.",
    ],
    relatedSlugs: ["cursor", "bolt", "lovable"],
  },
  durable: {
    slug: "durable",
    name: "Durable",
    kind: "ai",
    website: "https://durable.co",
    summary: "AI website builder for small service businesses that generates a site in about 30 seconds.",
    whatItIs:
      "Durable asks for a business type and location and generates a complete small-business website, with copy, stock imagery, a contact form and an optional CRM and invoicing. It targets contractors, salons, consultants and similar local services, and hosts the result on durable.site or a connected custom domain.",
    signals: ["durable.co", "durable.site", `generator" content="durable`],
    manualChecks: [
      "Check the address. Sites on *.durable.site are hosted by Durable.",
      `${VIEW_SOURCE} Search for "durable.co", which appears in asset URLs, footer credits and form endpoints.`,
      "Look for a <meta name=\"generator\"> tag naming Durable.",
      "Read the copy. Generated text tends to follow the same pattern for every business: a hero headline with the city name, three service cards and a testimonials block with stock portraits.",
    ],
    implications: [
      "Content is AI-written from a short prompt, so the analyzer's content section often shows low word counts, repeated phrasing and generic headings. Rewriting the copy is the biggest win for these sites.",
      "Stock images are loaded at large sizes. Image weight and missing modern formats are the usual performance findings.",
      "Basics such as HTTPS, a viewport tag and a mobile layout are handled by the platform, so the technical SEO checks mostly pass.",
      "Local-business schema and a Google Business Profile link are often missing even though they matter most for this audience.",
    ],
    relatedSlugs: ["b12", "hocoos", "10web"],
  },
  "10web": {
    slug: "10web",
    name: "10Web",
    kind: "ai",
    website: "https://10web.io",
    summary: "AI builder that generates a WordPress site with Elementor and hosts it on Google Cloud.",
    whatItIs:
      "10Web's AI Website Builder produces a real WordPress installation. It generates pages with its own Elementor-based widgets, hosts the site on 10Web's managed WordPress hosting, and bundles a performance plugin and a backup tool. Agencies use it to recreate or migrate client sites quickly.",
    signals: ["10web.io", `generator" content="10web`],
    manualChecks: [
      `${VIEW_SOURCE} Search for "10web.io" in asset URLs and plugin paths such as /wp-content/plugins/tenweb-*.`,
      "Look for the WordPress generator tag plus a 10Web generator tag; both can be present.",
      "Check for Elementor markers: elementor-* classes on sections and /wp-content/plugins/elementor/ assets.",
      "Hosting on 10Web often shows a *.10web.site address before a custom domain is connected.",
    ],
    implications: [
      "It is WordPress underneath, so the audit reads like any Elementor site: many stylesheets, render-blocking CSS and a large DOM are the common performance findings.",
      "10Web's booster plugin adds caching, image compression and lazy loading when enabled, which can lift PageSpeed scores considerably compared with a stock Elementor site.",
      "SEO fundamentals such as titles and descriptions depend on which SEO plugin is installed. Generated sites often ship without one, so those tags appear missing or duplicated.",
      "Because it is standard WordPress, everything the analyzer flags can be fixed with normal WordPress tools and plugins.",
    ],
    relatedSlugs: ["durable", "hostinger-website-builder", "dorik"],
  },
  b12: {
    slug: "b12",
    name: "B12",
    kind: "ai",
    website: "https://www.b12.io",
    summary: "AI website builder aimed at professional services, with scheduling, payments and intake forms.",
    whatItIs:
      "B12 generates a website draft from a description of a professional services business, then layers on client-facing tools: online scheduling, invoicing, e-signatures and intake forms. It is pitched at law firms, accountants, consultants and agencies, and includes human design review on higher tiers.",
    signals: ["b12.io", "b12sites.com"],
    manualChecks: [
      "Check the address. Sites on *.b12sites.com are hosted by B12.",
      `${VIEW_SOURCE} Search for "b12.io" in script and stylesheet URLs and in form actions.`,
      "Look for B12's embedded tools: scheduling widgets and intake forms that post to b12.io endpoints.",
      "A 'Website by B12' credit in the footer is present on most plans.",
    ],
    implications: [
      "Pages are served from B12's platform with HTTPS and a CDN, so transport security and basic caching checks pass.",
      "Embedded scheduling and form widgets add third-party JavaScript, which the analyzer's third-party impact section will list as a performance cost.",
      "AI-drafted copy for service firms tends toward generic claims. The content section usually recommends more specific, locally relevant text.",
      "Trust signals such as credentials, case results and reviews are often missing from the generated draft even though they matter for professional services.",
    ],
    relatedSlugs: ["durable", "hocoos", "dorik"],
  },
  dorik: {
    slug: "dorik",
    name: "Dorik",
    kind: "ai",
    website: "https://dorik.com",
    summary: "No-code builder with an AI generator that produces multi-page sites from a prompt.",
    whatItIs:
      "Dorik is a drag-and-drop website builder with an AI mode that creates a complete multi-page site, including copy and images, from a short description. It is popular with freelancers and small agencies because of its white-label and client-billing options, and hosts sites on dorik.io subdomains or custom domains.",
    signals: ["dorik.com", "dorik.io"],
    manualChecks: [
      "Check the address. Sites on *.dorik.io are hosted by Dorik.",
      `${VIEW_SOURCE} Search for "dorik.com" or "dorik.io" in asset URLs, which point at Dorik's CDN.`,
      "Look for a 'Made with Dorik' badge, shown on free plans.",
      "Inspect section markup in DevTools. Dorik's editor produces consistent wrapper classes and inline background styles across sections.",
    ],
    implications: [
      "Dorik renders static HTML, so crawlers see the content without running JavaScript, which is a good base for SEO.",
      "AI-generated pages come with AI-generated images and copy. The analyzer often flags large hero images and thin, generic text.",
      "Per-page titles and descriptions are editable but frequently left blank on generated pages, which shows up as missing or duplicate meta tags.",
      "Custom code injection is available, so missing items such as structured data can be added without leaving the platform.",
    ],
    relatedSlugs: ["10web", "typedream", "b12"],
  },
  hocoos: {
    slug: "hocoos",
    name: "Hocoos",
    kind: "ai",
    website: "https://hocoos.com",
    summary: "AI website builder that interviews you with a few questions and generates the site, logo and copy.",
    whatItIs:
      "Hocoos builds a small-business website by asking a short series of questions about the business, then generating the structure, text, images and even a logo. Editing happens through further AI prompts or a simple editor, and sites are hosted on Hocoos with a free subdomain or a custom domain.",
    signals: ["hocoos.com"],
    manualChecks: [
      `${VIEW_SOURCE} Search for "hocoos.com". Assets, fonts and form handlers are served from Hocoos domains.`,
      "Check the address for a Hocoos-provided subdomain if no custom domain is attached.",
      "Look for a Hocoos credit link in the footer, present on free and entry plans.",
      "Compare the page structure with other Hocoos sites: a hero with a generated image, an about block, a services grid and a contact form in that order is the standard output.",
    ],
    implications: [
      "The generated copy is short and generic by design. The content section usually reports low word counts and recommends adding specific details, prices and locations.",
      "Generated images are large. Image compression and modern formats are the typical performance recommendations.",
      "Platform hosting handles HTTPS, a viewport tag and responsive layout, so the technical basics pass.",
      "Analytics and structured data are not added by default, so measurement and rich-result checks commonly fail.",
    ],
    relatedSlugs: ["durable", "b12", "jimdo"],
  },

  // ── No-code builders ─────────────────────────────────────────────────────
  framer: {
    slug: "framer",
    name: "Framer",
    kind: "no-code",
    website: "https://www.framer.com",
    summary: "Design-first site builder that publishes static React sites from a visual canvas.",
    whatItIs:
      "Framer began as a prototyping tool and became a full website builder. Designers lay out pages on a canvas, add animations and CMS collections, and publish to a *.framer.website address or a custom domain. Its AI features generate layouts and copy, but most Framer sites are hand-designed, which is why it is listed here as a no-code builder.",
    signals: ["framerusercontent.com", "framer.com/m/", "framer.website", `"generator" content="framer`],
    manualChecks: [
      `${VIEW_SOURCE} Look for <meta name="generator" content="Framer ..."> with a version number. Framer adds it to every published site.`,
      "Search for \"framerusercontent.com\", the CDN that serves Framer images, fonts and scripts.",
      "Check the address. A *.framer.website or *.framer.app domain is Framer's free hosting.",
      "Script tags that load modules from framer.com/m/ are Framer's component runtime.",
    ],
    implications: [
      "Framer publishes pre-rendered HTML, so crawlers see headings and copy without JavaScript. Titles, descriptions and Open Graph tags are set per page in the editor and usually present.",
      "Large hero media and heavy scroll animations are the usual performance findings. Lottie files, videos and uncompressed PNGs on the canvas add up quickly.",
      "Framer's responsive breakpoints are explicit, so mobile layouts are usually sound; the analyzer's mobile checks tend to pass.",
      "Hosting includes HTTPS, HTTP/2 and a CDN. Custom security headers such as Content-Security-Policy cannot be set, so those checks report as missing.",
    ],
    relatedSlugs: ["typedream", "carrd", "v0"],
  },
  "hostinger-website-builder": {
    slug: "hostinger-website-builder",
    name: "Hostinger Website Builder",
    shortName: "Hostinger",
    kind: "no-code",
    website: "https://www.hostinger.com/website-builder",
    summary: "Hostinger's drag-and-drop builder, formerly Zyro, bundled with its hosting plans.",
    whatItIs:
      "Hostinger Website Builder is the former Zyro editor, now included with Hostinger hosting plans. It offers templates, a drag-and-drop grid editor, an AI writer and an AI site generator that produces a draft from a few questions. Sites publish on hostingersite.com or a custom domain; older sites still reference zyrosite.com.",
    signals: ["hostingersite.com", "zyrosite.com", `generator" content="zyro`],
    manualChecks: [
      "Check the address. Preview and free sites live on *.hostingersite.com; older ones on *.zyrosite.com.",
      `${VIEW_SOURCE} Search for "zyrosite.com" or "hostingersite.com" in image and asset URLs even when the site uses a custom domain.`,
      "Look for <meta name=\"generator\" content=\"Zyro\">, still emitted by many sites built before the rename.",
      "Inspect the layout grid in DevTools. The editor positions blocks with CSS grid and generates consistent block-* class names.",
    ],
    implications: [
      "Pages are served as static HTML from Hostinger's CDN, so crawlers can read the content and transport security checks pass.",
      "Images are often uploaded at full camera resolution. Oversized images and missing lazy loading are the most frequent performance findings.",
      "Per-page SEO fields exist in the editor but are frequently left empty on secondary pages, producing duplicate titles across the site.",
      "The AI-generated drafts share the same section order and wording patterns, so content checks recommend more specific copy.",
    ],
    relatedSlugs: ["godaddy-website-builder", "jimdo", "10web"],
  },
  jimdo: {
    slug: "jimdo",
    name: "Jimdo",
    kind: "no-code",
    website: "https://www.jimdo.com",
    summary: "German website builder whose Dolphin editor assembles a site from a short questionnaire.",
    whatItIs:
      "Jimdo is a long-running website builder popular with small businesses in Europe. Its Dolphin editor builds a starting site from a few questions about the business, while the older Creator editor offers a more manual approach. Sites are hosted on jimdosite.com or jimdofree.com subdomains, or on a custom domain.",
    signals: ["jimdo.com/", "jimdosite.com", "jimdofree.com"],
    manualChecks: [
      "Check the address. *.jimdosite.com and *.jimdofree.com are Jimdo's free hosting.",
      `${VIEW_SOURCE} Search for "jimdo.com/" in asset and script URLs, which point at Jimdo's CDN.`,
      "Look for a Jimdo credit link in the footer, mandatory on free plans.",
      "Legal pages such as Impressum and Datenschutz generated by Jimdo's templates are a strong hint on German-language sites.",
    ],
    implications: [
      "Jimdo serves static pages over HTTPS from its own infrastructure, so transport checks and basic caching pass.",
      "Questionnaire-generated sites keep stock imagery and short copy. Thin content and large images are the typical findings.",
      "Per-page titles and descriptions are editable but rarely filled in beyond the home page.",
      "Free-plan sites carry Jimdo advertising, which the analyzer notes as third-party scripts and a trust-signal concern.",
    ],
    relatedSlugs: ["hostinger-website-builder", "godaddy-website-builder", "strikingly"],
  },
  "godaddy-website-builder": {
    slug: "godaddy-website-builder",
    name: "GoDaddy Website Builder",
    shortName: "GoDaddy",
    kind: "no-code",
    website: "https://www.godaddy.com/websites/website-builder",
    summary: "GoDaddy's template builder, now generated and edited with its Airo AI assistant.",
    whatItIs:
      "GoDaddy Website Builder is the site editor bundled with GoDaddy domains and hosting. Its Airo assistant generates a starting site, logo and copy from the domain name and a business description, and the section-based editor handles the rest. Sites publish to godaddysites.com subdomains or to the purchased domain.",
    signals: ["godaddysites.com"],
    manualChecks: [
      "Check the address. A *.godaddysites.com domain is GoDaddy's hosted builder.",
      `${VIEW_SOURCE} Search for "godaddysites.com" in image URLs; media stays on that host after a custom domain is connected.`,
      "Look for GoDaddy's section markup: data-ux attributes such as data-ux=\"Section\" on most blocks.",
      "A 'Powered by GoDaddy' footer link is present on many plans.",
    ],
    implications: [
      "Pages are server-rendered and served over HTTPS from GoDaddy's CDN, so crawlers see the content and transport checks pass.",
      "The builder injects its own scripts for analytics, chat and marketing features, which the third-party impact section lists as a cost.",
      "Image handling is automatic but conservative; large hero images and missing modern formats appear in most audits.",
      "SEO fields are present per page. Airo-generated sites often ship with the generated description unchanged, which reads as generic in the audit.",
    ],
    relatedSlugs: ["hostinger-website-builder", "jimdo", "durable"],
  },
  unbounce: {
    slug: "unbounce",
    name: "Unbounce",
    kind: "no-code",
    website: "https://unbounce.com",
    summary: "Landing page builder for paid campaigns, with A/B testing and an AI Smart Builder.",
    whatItIs:
      "Unbounce builds standalone landing pages for advertising campaigns rather than whole websites. Marketers design pages in its Classic or Smart Builder, run A/B tests and route traffic with Smart Traffic. Pages publish to unbouncepages.com or to a subdomain of the advertiser's site.",
    signals: ["unbouncepages.com", "unbounce.com/js/"],
    manualChecks: [
      "Check the address. Pages on *.unbouncepages.com are Unbounce-hosted; many brands use a subdomain such as get.example.com pointed at Unbounce.",
      `${VIEW_SOURCE} Search for "unbounce.com/js/", the path of Unbounce's page runtime and form scripts.`,
      "Look for form markup posting to Unbounce endpoints and hidden fields such as ub-form-*.",
      "The page usually has no main navigation and a single call to action, which is characteristic of campaign landing pages.",
    ],
    implications: [
      "Landing pages are often set to noindex on purpose. The analyzer reports that as an SEO finding; for a paid-traffic page it is usually intended.",
      "Conversion checks score well because the format forces a single clear call to action, a form and trust elements above the fold.",
      "Marketing tags for ads, analytics and heatmaps accumulate on these pages, so third-party script weight is the common performance finding.",
      "Unbounce serves pages over HTTPS from a CDN; custom security headers are limited, so header checks report gaps.",
    ],
    relatedSlugs: ["leadpages", "carrd", "strikingly"],
  },
  leadpages: {
    slug: "leadpages",
    name: "Leadpages",
    kind: "no-code",
    website: "https://www.leadpages.com",
    summary: "Landing page and lead-capture builder with pop-ups, alert bars and built-in conversion tips.",
    whatItIs:
      "Leadpages is a conversion-focused builder for landing pages, opt-in forms and small sites. It includes pop-ups, alert bars, checkout widgets and a real-time conversion guidance panel. Pages publish to leadpages.co subdomains or a connected domain, and assets load from leadpages.net.",
    signals: ["leadpages.co", "leadpages.net/"],
    manualChecks: [
      "Check the address. *.lpages.co and *.leadpages.co are Leadpages hosting.",
      `${VIEW_SOURCE} Search for "leadpages.net/", the CDN that serves Leadpages scripts and images.`,
      "Look for pop-up and alert-bar scripts injected by Leadpages, and form actions pointing at Leadpages endpoints.",
      "Sections with lp-pom-* or lp-element class names are a Leadpages fingerprint.",
    ],
    implications: [
      "Conversion elements score well: a clear call to action, a short form and social proof blocks are built into most templates.",
      "Third-party JavaScript for pop-ups, analytics and email integrations is the usual performance cost reported by the analyzer.",
      "Content is intentionally brief, so content-depth checks are low; that is expected for a lead-capture page.",
      "Per-page SEO settings exist, but campaign pages are often left with default titles or marked noindex.",
    ],
    relatedSlugs: ["unbounce", "carrd", "strikingly"],
  },
  carrd: {
    slug: "carrd",
    name: "Carrd",
    kind: "no-code",
    website: "https://carrd.co",
    summary: "Minimal one-page site builder used for personal pages, link hubs and product teasers.",
    whatItIs:
      "Carrd builds simple, responsive one-page sites. It is a favourite for personal profiles, link-in-bio pages, waitlists and product teasers because a page takes minutes to publish. Sites live on *.carrd.co or a custom domain on paid plans.",
    signals: ["carrd.co", `generator" content="carrd`],
    manualChecks: [
      `${VIEW_SOURCE} Look for <meta name="generator" content="Carrd ..."> near the top of the head; Carrd adds it to every published site.`,
      "Check the address. *.carrd.co is Carrd's hosting.",
      "Search the source for \"carrd.co\" in asset URLs, which remain after a custom domain is connected.",
      "The entire page is one HTML file with inline CSS and a single script, which is unusual for anything other than Carrd.",
    ],
    implications: [
      "Pages are static, light and fast. Performance scores are usually high because there is little JavaScript and few requests.",
      "One page means one title and description. The analyzer's SEO section is short; the common gap is a missing description or Open Graph image.",
      "Forms post to Carrd's handlers or a connected service such as Mailchimp, so the form-related conversion checks depend on that setup.",
      "Custom security headers are not available, so header checks report gaps even though HTTPS is enforced.",
    ],
    relatedSlugs: ["typedream", "strikingly", "framer"],
  },
  strikingly: {
    slug: "strikingly",
    name: "Strikingly",
    kind: "no-code",
    website: "https://www.strikingly.com",
    summary: "One-page-first website builder with a simple store and blog, popular with startups and creators.",
    whatItIs:
      "Strikingly started as a one-page site builder and now supports multi-page sites, a small e-commerce store and a blog. Its editor works in stacked sections, and sites publish to *.mystrikingly.com or a custom domain.",
    signals: ["strikingly.com", "s.strikingly.com"],
    manualChecks: [
      "Check the address. *.mystrikingly.com is Strikingly's hosting.",
      `${VIEW_SOURCE} Search for "s.strikingly.com", the CDN host for Strikingly scripts and uploaded images.`,
      "Look for section markup with s-section and s-component class names.",
      "Free plans show a 'Made with Strikingly' badge in the corner or footer.",
    ],
    implications: [
      "Pages are served over HTTPS with a CDN; transport and basic caching checks pass.",
      "The editor loads a sizeable runtime for every site, so unused JavaScript is a consistent performance finding.",
      "Per-page SEO fields are available but, as with most builders, often left at defaults beyond the home page.",
      "Stacked full-width sections with large background images make image weight the top performance recommendation.",
    ],
    relatedSlugs: ["carrd", "ucraft", "jimdo"],
  },
  ucraft: {
    slug: "ucraft",
    name: "Ucraft",
    kind: "no-code",
    website: "https://www.ucraft.com",
    summary: "Drag-and-drop builder with a logo maker and e-commerce, hosted on ucraft.net subdomains.",
    whatItIs:
      "Ucraft is a website builder with a logo maker, a blog, an online store and a drag-and-drop editor aimed at designers and small brands. Sites publish to *.ucraft.net (or *.ucraft.site on newer plans) or a custom domain, with assets served from Ucraft's hosts.",
    signals: ["ucraft.com", "ucraft.net"],
    manualChecks: [
      "Check the address. *.ucraft.net and *.ucraft.site are Ucraft hosting.",
      `${VIEW_SOURCE} Search for "ucraft.com" or "ucraft.net" in script, stylesheet and image URLs.`,
      "Look for a 'Powered by Ucraft' credit, shown on free plans.",
      "Inspect the markup for Ucraft's element wrappers, which carry consistent data attributes across sections.",
    ],
    implications: [
      "Hosting provides HTTPS and a CDN, so transport checks pass.",
      "The editor's runtime and uploaded images are the usual performance findings: unused JavaScript and oversized media.",
      "SEO settings exist per page; audits frequently find duplicate titles on inner pages and missing descriptions.",
      "Store pages built with Ucraft rely on client-side scripts for cart behaviour, which the analyzer lists under third-party impact.",
    ],
    relatedSlugs: ["strikingly", "dorik", "jimdo"],
  },
  typedream: {
    slug: "typedream",
    name: "Typedream",
    kind: "no-code",
    website: "https://typedream.com",
    summary: "Notion-style website builder that publishes clean static pages from a document editor.",
    whatItIs:
      "Typedream lets you write a website the way you would write a Notion document: blocks, columns and callouts, published as a fast static site. It is used for personal sites, startup landing pages and documentation. Sites publish to *.typedream.app or a custom domain, and fonts and assets load from typedream.com.",
    signals: ["typedream.app", "typedream.com/fonts"],
    manualChecks: [
      "Check the address. *.typedream.app is Typedream's hosting.",
      `${VIEW_SOURCE} Search for "typedream.com/fonts", where Typedream serves its web fonts.`,
      "Look for a 'Made with Typedream' badge, present on free plans.",
      "The page structure mirrors a document: a single column of blocks with generous spacing and few nested containers.",
    ],
    implications: [
      "Typedream publishes pre-rendered HTML, so crawlers see the text and the SEO section usually has few structural complaints.",
      "Performance is typically good because pages are light; web font loading is the most common recommendation.",
      "Document-style sites often lack a clear call to action and trust signals, which lowers the conversion score.",
      "Per-page titles and descriptions are editable; the common gap is a missing Open Graph image.",
    ],
    relatedSlugs: ["carrd", "framer", "dorik"],
  },
};

export const BUILDER_ORDER: string[] = Object.keys(BUILDERS);

export function buildersOfKind(kind: BuilderKind): Builder[] {
  return BUILDER_ORDER.map((s) => BUILDERS[s]).filter((b) => b.kind === kind);
}

/** Heading-friendly name: "Bolt" rather than "Bolt (StackBlitz)". */
export function displayName(builder: Builder): string {
  return builder.shortName ?? builder.name;
}

/** Maps the backend's `aiDetection.builder` value to a page slug, or null. */
export function builderSlugForName(name: string | undefined | null): string | null {
  if (!name) return null;
  const hit = BUILDER_ORDER.find((s) => BUILDERS[s].name === name);
  return hit ?? null;
}

export function relatedBuilders(builder: Builder): Builder[] {
  return builder.relatedSlugs.map((s) => BUILDERS[s]).filter(Boolean);
}
