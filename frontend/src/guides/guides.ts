// The fix-guide catalog: a static, typed mapping from issue keys to
// plain-English repair guides. No backend, no CMS — content lives here, is
// versioned with the code, and renders at /guides and /guides/:slug.
//
// Wiring rule: `guideForIssue` maps scanner issue IDs (see utils/priorityIssues)
// to slugs. Issues without a guide simply don't render a "How to fix" link,
// so the catalog can be filled in gradually.

export type GuideCategory = "SEO" | "Performance" | "UX & Conversion" | "Security" | "Content";

export interface Guide {
  slug: string;
  title: string;
  category: GuideCategory;
  /** One-liner shown on the index card. */
  summary: string;
  /** What the issue actually is, for a non-technical reader. */
  whatItMeans: string;
  /** The concrete cost of leaving it unfixed. */
  whyItMatters: string;
  /** Ordered repair steps, most impactful first. */
  steps: string[];
  /** Free tools that help diagnose or verify the fix. */
  tools?: string[];
  /** Optional illustration shown under a given step (0-based index).
   *  Files live in /public/guides/ — SVG diagrams or real screenshots. */
  stepImages?: Record<number, { src: string; caption: string }>;
  /** Ready-to-copy prompt users can paste into an AI assistant to get tailored fix advice. */
  aiPrompt?: string;
}

export const GUIDES: Record<string, Guide> = {
  // ── Performance ──────────────────────────────────────────────────────────
  "lcp": {
    slug: "lcp",
    title: "Fix slow Largest Contentful Paint (LCP)",
    category: "Performance",
    summary: "Make the biggest visible element on your page load in under 2.5 seconds.",
    whatItMeans:
      "LCP measures how long it takes for the largest element a visitor sees — usually a hero image or headline — to appear on screen. Google considers anything over 4 seconds poor and under 2.5 seconds good.",
    whyItMatters:
      "Visitors decide within seconds whether a page is worth waiting for, and Google ranks slow pages lower. Every extra second of LCP measurably increases the share of people who leave before seeing your offer.",
    steps: [
      "Find the exact element in PageSpeed Insights (the 'Largest Contentful Paint' audit names it). In most sites it's the hero image or an H1.",
      "If it's an image: compress it (TinyPNG or Squoosh), resize it to the largest size actually displayed, and serve it in WebP or AVIF format.",
      "Add fetchpriority=\"high\" and a preload link for the hero image so the browser starts downloading it immediately.",
      "Serve the page through a CDN so the image travels a short physical distance to the visitor.",
      "Remove render-blocking scripts and fonts in the page head so the browser can start painting sooner (see our render-blocking guide).",
      "Re-run your audit after each change — LCP improvements are cumulative and easy to verify.",
    ],
    tools: ["PageSpeed Insights", "Squoosh (image compression)", "WebPageTest (waterfall view)"],
    aiPrompt: "My website's Largest Contentful Paint (LCP) is too slow — the main content takes over 2.5 seconds to appear. Can you identify the likely causes (hero image size, render-blocking resources, or slow server response) and give me specific, prioritised steps to bring LCP under 2.5 seconds?",
  },
  "cls": {
    slug: "cls",
    title: "Stop layout shifting (CLS)",
    category: "Performance",
    summary: "Reserve space for images and embeds so the page stops jumping while loading.",
    whatItMeans:
      "CLS (Cumulative Layout Shift) measures how much visible content moves around while the page loads. Buttons that dodge your cursor and text that gets pushed down are layout shifts.",
    whyItMatters:
      "Shifting layouts cause mis-taps and frustration — and Google penalises them directly in mobile rankings. High CLS is one of the fastest ways to make a site feel broken.",
    steps: [
      "Add explicit width and height (or an aspect-ratio CSS property) to every <img> and <video> tag so the browser can reserve space before loading.",
      "Reserve space for embeds (ads, videos, social posts, maps) with a fixed-height container.",
      "Never inject banners, cookie bars, or sign-up prompts above existing content after the page has loaded — overlay them instead.",
      "Load web fonts with font-display: swap and preloaded font files so text doesn't reflow when the real font arrives.",
      "Verify with PageSpeed Insights until CLS is below 0.1.",
    ],
    tools: ["PageSpeed Insights", "Chrome DevTools → Performance panel"],
    stepImages: { 0: { src: "/guides/cls-layout-shift.svg", caption: "Reserving space keeps the layout stable while images load." } },
    aiPrompt: "My website has a high Cumulative Layout Shift (CLS) score — elements are jumping around as the page loads, which frustrates visitors and hurts my Google ranking. Can you show me how to add explicit dimensions to images, reserve space for late-loading embeds, and verify the fix with PageSpeed Insights?",
  },
  "tbt": {
    slug: "tbt",
    title: "Reduce Total Blocking Time (TBT)",
    category: "Performance",
    summary: "Break up long JavaScript tasks so the page stays responsive to taps and clicks.",
    whatItMeans:
      "TBT measures how long the page's main thread is blocked by long JavaScript tasks after a visitor can first see the page. A blocked page looks loaded but ignores taps, scrolls, and clicks.",
    whyItMatters:
      "Visitors perceive an unresponsive page as broken and leave. Google's field data (INP) uses the same signal, so high TBT drags both rankings and conversions down together.",
    steps: [
      "Run PageSpeed Insights and note which third-party scripts dominate (chat widgets, analytics, ads, embeds are the usual suspects).",
      "Remove every third-party script you don't actively use — each one runs on the same main thread as your page.",
      "Defer the rest: load non-essential scripts after the first user interaction or with the async attribute.",
      "If you use a JavaScript framework, enable code splitting so each page only downloads the code it needs.",
      "Break up long tasks in your own code with setTimeout scheduling or a web worker for heavy computation.",
    ],
    tools: ["PageSpeed Insights", "Chrome DevTools → Performance", "Lighthouse"],
    aiPrompt: "My website's Total Blocking Time (TBT) is too high — JavaScript is blocking the main thread after the page appears, making it unresponsive to taps and clicks. Can you identify the types of scripts most likely causing this and walk me through deferring, removing, or splitting them to bring TBT under 200ms?",
  },
  "mobile-performance": {
    slug: "mobile-performance",
    title: "Improve mobile page performance",
    category: "Performance",
    summary: "Cut image weight, JavaScript, and server lag so the page loads fast on phones.",
    whatItMeans:
      "Your mobile Lighthouse score blends how fast the page loads, how quickly it becomes interactive, and how stable it is while loading. Phones have slower CPUs and networks than desktops, so the same page scores much lower there.",
    whyItMatters:
      "Over 60% of web traffic is mobile, and Google ranks your site primarily by its mobile version. A low mobile score means most of your visitors are getting your worst experience.",
    steps: [
      "Compress and resize every image to the size it's actually displayed at, and serve WebP/AVIF (see our image format guide).",
      "Enable compression (gzip/brotli) and browser caching on your server or CDN.",
      "Remove unused CSS and JavaScript — most page builders ship far more code than a page uses.",
      "Reduce third-party scripts to the minimum that earns its keep.",
      "Check your hosting: if server response (TTFB) is over ~0.8s, a CDN or better hosting will lift every other metric too.",
    ],
    tools: ["PageSpeed Insights", "WebPageTest", "Chrome DevTools → Lighthouse"],
    stepImages: { 4: { src: "/guides/pagespeed-insights.png", caption: "Re-test after each change — scores move fast once the big items are fixed." } },
    aiPrompt: "My website has a poor mobile performance score — pages feel slow on phones and my Lighthouse mobile score is below 50. Can you walk me through the highest-impact mobile optimisations in order: image compression first, then JavaScript, then server response time?",
  },
  "image-formats": {
    slug: "image-formats",
    title: "Convert images to WebP or AVIF",
    category: "Performance",
    summary: "Modern image formats are 25–50% smaller than JPEG/PNG at the same visual quality.",
    whatItMeans:
      "JPEG and PNG date from the 1990s. WebP and AVIF are modern formats that all current browsers support, producing dramatically smaller files for the same picture.",
    whyItMatters:
      "Images are usually the heaviest thing on a page. Cutting their size in half is the single cheapest speed win available — and it directly improves LCP and your mobile score.",
    steps: [
      "Export new images as WebP (or AVIF for even smaller files) directly from your design tool, or batch-convert existing ones with Squoosh or ImageMagick.",
      "On WordPress, install an optimisation plugin (ShortPixel, Imagify, or Smush) that converts automatically.",
      "Use the <picture> tag to serve the modern format with the old one as fallback for very old browsers.",
      "While you're at it, resize images to their display size — a 4000px-wide photo in a 400px slot wastes 90% of its bytes.",
    ],
    tools: ["Squoosh", "TinyPNG", "ShortPixel / Imagify (WordPress)"],
    aiPrompt: "My website is serving images in JPEG, PNG, or GIF format instead of modern formats. Can you show me how to convert them to WebP or AVIF, which tools to use, and how to serve the modern format with a JPEG/PNG fallback for browsers that don't support it yet?",
    stepImages: {
      0: { src: "/guides/image-formats-compare.svg", caption: "Typical savings for the same photo." },
      1: { src: "/guides/squoosh-editor.png", caption: "Squoosh.app converts and compresses right in your browser — free, no signup." },
    },
  },
  "lazy-loading": {
    slug: "lazy-loading",
    title: "Add lazy loading to off-screen images",
    category: "Performance",
    summary: "One HTML attribute stops below-the-fold images from delaying the page.",
    whatItMeans:
      "By default browsers download every image on the page, even ones far below the visible screen. Lazy loading tells the browser to wait until the visitor scrolls near an image.",
    whyItMatters:
      "Every image downloaded before the page can render delays what the visitor actually came to see. Lazy loading off-screen images is a one-line change per image with zero visual downside.",
    steps: [
      'Add loading="lazy" to every <img> tag that appears below the first screen.',
      'Do NOT lazy-load your hero/LCP image — that one should get fetchpriority="high" instead (see our LCP guide).',
      "On WordPress, most caching/optimisation plugins can add lazy loading site-wide in one setting (native browser lazy loading, not JavaScript-based).",
      "Re-run your audit to confirm the image weight on initial load dropped.",
    ],
    tools: ["PageSpeed Insights"],
    stepImages: { 1: { src: "/guides/lazy-loading-code.svg", caption: "The attribute in context — plus the one image you should NOT lazy-load." } },
    aiPrompt: "Several images on my website load immediately even when they're far below the visible screen, wasting bandwidth and slowing the initial load. Can you explain how to add loading='lazy' correctly, which images must NOT be lazy-loaded (above-the-fold / hero images), and how to verify it's working?",
  },
  "render-blocking-resources": {
    slug: "render-blocking-resources",
    title: "Remove render-blocking scripts and styles",
    category: "Performance",
    summary: "Let the browser paint first, load everything else after.",
    whatItMeans:
      "A render-blocking script or stylesheet sits in the page head and forces the browser to download and execute it before painting anything. Visitors stare at a blank screen until it finishes.",
    whyItMatters:
      "Blocking resources delay every single visitor on every single visit. Removing them is usually a few lines of HTML and often cuts time-to-first-paint dramatically.",
    steps: [
      "Add the defer attribute to every <script> in the head that isn't needed to render the initial view.",
      "Move analytics and marketing tags into a tag manager configured to load after page interaction.",
      "Inline the small amount of CSS needed for the first screen (critical CSS) and load the rest asynchronously.",
      "Remove plugins/tag-manager entries you no longer use — dead tags are the most common offender.",
    ],
    tools: ["PageSpeed Insights", "Chrome DevTools → Coverage"],
    aiPrompt: "My website has render-blocking JavaScript and CSS in the <head> that are delaying the first paint — visitors see a blank page until they finish loading. Can you walk me through adding defer to scripts, inlining critical CSS, and loading the rest asynchronously with concrete examples?",
  },

  // ── SEO ──────────────────────────────────────────────────────────────────
  "page-title": {
    slug: "page-title",
    title: "Write a proper page title",
    category: "SEO",
    summary: "The single most important on-page SEO element — 50–60 characters that sell the click.",
    whatItMeans:
      "The page title (<title> tag) is the blue headline shown in Google results and the browser tab. It's the strongest on-page ranking signal and your ad copy on the search results page.",
    whyItMatters:
      "A missing, duplicate, or vague title makes Google invent its own snippet and weakens your ranking for every search that describes your business. Fixing it is the highest-value 10-minute SEO task there is.",
    steps: [
      "Describe what the page offers, for whom, in plain words — e.g. 'Wedding Photography in Leeds | Studio Name'.",
      "Keep it between 50 and 60 characters so Google doesn't truncate it.",
      "Put the most important keyword phrase near the beginning.",
      "Make every page's title unique — duplicate titles make pages compete with each other.",
      "In most CMSs this is an 'SEO title' field (Yoast/Rank Math on WordPress) or an SEO settings panel.",
    ],
    tools: ["Google Search Console", "Ahrefs/Semrush site audit"],
    stepImages: { 1: { src: "/guides/serp-snippet.svg", caption: "How your title and description appear in search results." } },
    aiPrompt: "My web page is missing a proper title tag — it's either absent, too long, or too generic to earn clicks from search results. Can you write a compelling title tag for a page about [describe your page] that is under 60 characters, includes the primary keyword near the start, and will improve click-through rate?",
  },
  "meta-description": {
    slug: "meta-description",
    title: "Add a meta description",
    category: "SEO",
    summary: "Your 150-character pitch shown under the title in search results.",
    whatItMeans:
      "The meta description is the summary text Google shows beneath your page title. It doesn't directly affect ranking, but it decides whether searchers click on you or the result above you.",
    whyItMatters:
      "With no description, Google picks random text from the page — often a menu or legal footer. A written description reliably raises click-through, which is free traffic for zero code.",
    steps: [
      "Write 140–160 characters: what the visitor gets + a reason to click ('See prices', 'Free trial').",
      "Include the words a searcher would type — Google bolds them in the snippet.",
      "In WordPress this is the 'meta description' field in your SEO plugin; on Shopify it's the 'search engine listing' on each product/page.",
      "Write unique descriptions for your top pages first — homepage, main services, best products.",
    ],
    tools: ["Google Search Console", "SERP snippet preview tools"],
    stepImages: { 2: { src: "/guides/serp-snippet.svg", caption: "The description is your pitch under the blue link." } },
    aiPrompt: "My web page's meta description is missing or not compelling enough to earn clicks from search results. Can you write a meta description for a page about [describe your page] that is 140–160 characters, includes the target keyword naturally, and reads like a genuine pitch to click?",
  },
  "h1-heading": {
    slug: "h1-heading",
    title: "Use exactly one H1 heading",
    category: "SEO",
    summary: "The H1 tells Google and visitors what the page is about — there should be one per page.",
    whatItMeans:
      "The H1 is the main headline of a page. Pages with zero H1s give Google no headline signal; pages with several dilute it.",
    whyItMatters:
      "Search engines weight the H1 heavily to understand page topic. A clear single H1 that matches the page title reinforces what you rank for and improves accessibility at the same time.",
    steps: [
      "Open the page in your editor and check the heading structure — exactly one <h1>, then <h2>/<h3> for sections.",
      "Make the H1 similar to the page title but written for humans, not search engines.",
      "In page builders, the 'Title' block usually renders as H1 — extra styled headings should be changed to H2.",
      "Remove empty or decorative heading tags left behind by templates.",
    ],
    tools: ["Chrome DevTools → Elements", "HeadingsMap extension"],
    aiPrompt: "My web page either has no H1 heading or has multiple H1s, which confuses search engines about the page's topic. Can you explain the correct heading structure (one H1, then H2/H3 for sections) and help me write a single H1 that matches my primary keyword and intent?",
  },
  "image-alt-text": {
    slug: "image-alt-text",
    title: "Add alt text to images",
    category: "SEO",
    summary: "Describe each image in a few words — for accessibility, SEO, and slow connections.",
    whatItMeans:
      "Alt text is the written description attached to an image tag. Screen readers speak it to blind visitors, Google reads it to understand the image, and browsers show it when an image fails to load.",
    whyItMatters:
      "Missing alt text excludes visually impaired visitors (an accessibility and legal risk), forfeits Google Images traffic, and fails a Core Web Vitals-adjacent audit that customers increasingly check.",
    steps: [
      "Describe what the image shows in a short phrase: 'Oak dining table with six chairs' — not 'image' or 'photo'.",
      "Leave alt text empty for purely decorative images (alt=\"\") so screen readers skip them.",
      "In WordPress/Shopify this is the 'Alt text' field in the image settings — fill it as you upload, then backfill the existing library.",
      "Prioritise pages that get traffic first; our SEO tab lists exactly which images are missing alt text.",
    ],
    tools: ["Our SEO audit tab", "WAVE accessibility extension"],
    aiPrompt: "Many images on my website are missing alt text, which hurts both accessibility and image SEO. Can you explain the rules for writing good alt text — when to describe the image versus leaving it empty for decorative images — and give me concrete examples for different image types?",
  },
  "open-graph-tags": {
    slug: "open-graph-tags",
    title: "Add Open Graph tags for social sharing",
    category: "SEO",
    summary: "Control the title, description, and preview image shown when your page is shared.",
    whatItMeans:
      "Open Graph (og:) tags tell WhatsApp, LinkedIn, X, Facebook, and iMessage what image and text to show in a link preview. Without them, shares show a bare link or a random image.",
    whyItMatters:
      "Links with good preview images get substantially more clicks. If anyone ever shares your site — you, customers, a viral moment — you want the best possible first impression.",
    steps: [
      "Add these to the page head: og:title, og:description, og:type, og:url, and og:image (a 1200×630 image).",
      "Most SEO plugins add these automatically from your title/description — enable the 'social' section and set a default share image.",
      "Use absolute URLs for og:image and keep the file under ~1MB.",
      "Verify with the debuggers below after publishing (they also clear the platforms' caches).",
    ],
    tools: ["Facebook Sharing Debugger", "LinkedIn Post Inspector"],
    aiPrompt: "My website is missing Open Graph meta tags, so links shared on social media show no preview image, title, or description — just a bare URL. Can you show me the exact og: tags I need to add to the HTML <head> and explain the correct image dimensions for social previews?",
  },
  "canonical-url": {
    slug: "canonical-url",
    title: "Set a canonical URL",
    category: "SEO",
    summary: "Tell Google which version of a page is the real one when several URLs serve it.",
    whatItMeans:
      "The same page is often reachable at multiple URLs (with/without www, with query parameters, http/https). A canonical link tells search engines which one to index so the duplicates don't compete.",
    whyItMatters:
      "Without a canonical, Google may index the wrong variant and split your ranking signals across duplicate URLs — weakening the page for its most important searches.",
    steps: [
      'Add <link rel="canonical" href="https://yourdomain.com/preferred-path"> to the page head.',
      "Most SEO plugins output this automatically — check that the setting is on and points at the live domain.",
      "Make sure the canonical is absolute (full URL with https) and self-referencing on normal pages.",
      "Verify the page renders on one canonical domain — redirect http→https and non-www→www (or vice versa) at the server.",
    ],
    tools: ["Google Search Console → URL Inspection"],
    aiPrompt: "My website has duplicate content issues because pages are reachable at multiple URLs — with and without www, with and without trailing slash, and over both HTTP and HTTPS. Can you show me how to add a canonical link tag and configure server-level redirects to consolidate everything to one authoritative URL?",
  },
  "https": {
    slug: "https",
    title: "Serve the site over HTTPS",
    category: "Security",
    summary: "The padlock in the address bar — table stakes for trust, SEO, and browser features.",
    whatItMeans:
      "HTTPS encrypts traffic between the visitor and your site. Without it, browsers label the page 'Not secure' and networks between the visitor and you can read or alter the traffic.",
    whyItMatters:
      "Chrome and Firefox warn visitors away from non-HTTPS pages, Google uses HTTPS as a ranking signal, and payment or login flows are effectively impossible without it.",
    steps: [
      "Get a free certificate from Let's Encrypt — most hosts (and Cloudflare) issue and renew them automatically in the dashboard.",
      "Redirect all http:// traffic to https:// with a permanent (301) redirect.",
      "Update any hardcoded http:// links inside your pages and CMS to https://.",
      "Re-run the audit to confirm the padlock and check for mixed-content warnings (see our mixed content guide).",
    ],
    tools: ["Let's Encrypt", "SSL Labs Server Test", "Cloudflare"],
    aiPrompt: "My website is not fully on HTTPS or has mixed-content warnings where HTTP resources are loaded on HTTPS pages. Can you walk me through getting a free SSL certificate, setting up HTTP-to-HTTPS redirects, and finding and fixing any remaining mixed content?",
  },
  "viewport-meta": {
    slug: "viewport-meta",
    title: "Add the viewport meta tag",
    category: "UX & Conversion",
    summary: "One line of HTML that makes your site render at mobile width instead of zoomed-out desktop.",
    whatItMeans:
      'The viewport tag (<meta name="viewport" content="width=device-width, initial-scale=1">) tells phones to render the page at the device\'s width. Without it, phones show a zoomed-out desktop layout.',
    whyItMatters:
      "Missing viewport makes a site unusable on phones — visitors must pinch and zoom to read anything. Google also flags it in mobile usability reports and ranks accordingly.",
    steps: [
      'Add <meta name="viewport" content="width=device-width, initial-scale=1"> inside the <head> of every page.',
      "In most templates and page builders this is already present — if it's missing, your theme is very old; update it.",
      "Then test on a real phone: text should be readable without zooming and no horizontal scrolling should occur.",
    ],
    tools: ["Chrome DevTools device toolbar"],
    aiPrompt: "My website is missing the viewport meta tag and renders at full desktop width on mobile devices, making text tiny and impossible to read without zooming. Can you explain the correct viewport meta tag, what width=device-width and initial-scale=1 actually do, and how to test it's working?",
  },
  "robots-directive": {
    slug: "robots-directive",
    title: "Fix the robots directive blocking Google",
    category: "SEO",
    summary: "A noindex or robots.txt rule is telling search engines to stay away.",
    whatItMeans:
      "A meta robots tag (noindex/nofollow) or a robots.txt rule is instructing search engines not to index this page. Sometimes that's intentional (admin pages), but on a public page it means Google cannot rank it at all.",
    whyItMatters:
      "A noindex on your homepage or key service pages makes every other SEO effort pointless — the page is invisible to search no matter how good it is.",
    steps: [
      "Search the page source for 'noindex' — it usually appears in a <meta name=\"robots\"> tag.",
      "Remove the noindex directive from pages that should rank (CMS 'discourage search engines' settings and staging plugins are common culprits).",
      "Check yoursite.com/robots.txt for Disallow rules covering important paths.",
      "After fixing, request re-indexing in Google Search Console.",
    ],
    tools: ["Google Search Console → URL Inspection", "Robots.txt tester"],
    aiPrompt: "My website's robots.txt file is missing or misconfigured — I'm not sure if it's blocking important pages or allowing access to admin areas. Can you show me how to write a correct robots.txt that lets search engines crawl public pages, blocks private paths, and references my sitemap?",
  },
  "structured-data": {
    slug: "structured-data",
    title: "Add structured data (schema markup)",
    category: "SEO",
    summary: "Machine-readable labels that earn rich results like star ratings in search.",
    whatItMeans:
      "Structured data (JSON-LD) explicitly tells search engines what your content is — a product with a price, a business with opening hours, an article with an author.",
    whyItMatters:
      "Pages with valid schema can win rich results — star ratings, prices, FAQs directly in search — which visibly increase click-through over plain blue links.",
    steps: [
      "Pick the schema type that matches the page: LocalBusiness, Product, Article, FAQ, or BreadcrumbList.",
      "Generate the JSON-LD with Google's Rich Results template or a schema generator, then paste it before </head>.",
      "On WordPress, Rank Math and Yoast output most schema types from fields you already fill in.",
      "Validate with the Rich Results Test and fix any errors it reports.",
    ],
    tools: ["Google Rich Results Test", "Schema.org generator"],
    aiPrompt: "My website has no structured data, so I'm missing out on rich results like star ratings and FAQs in Google search. Based on my page type [blog post / local business / product / FAQ], can you write the exact JSON-LD schema to add to my page <head> to be eligible for rich snippets?",
  },
  "mixed-content": {
    slug: "mixed-content",
    title: "Fix mixed content warnings",
    category: "Security",
    summary: "Some assets on your HTTPS page are still loaded over insecure HTTP.",
    whatItMeans:
      "Mixed content means an HTTPS page loads images, scripts, or iframes over plain HTTP. Browsers downgrade the padlock and may block the asset entirely.",
    whyItMatters:
      "The 'Not fully secure' warning erodes trust at the exact moment visitors check who you are, and blocked assets can silently break images, fonts, or embeds.",
    steps: [
      "Open DevTools → Console; Chrome lists every insecure URL on the page.",
      "Update those references to https:// — most are old image links, fonts, or embed code pasted years ago.",
      "In WordPress, a search-and-replace plugin (or Better Search Replace on the database) fixes bulk http:// links.",
      "Add a Content-Security-Policy upgrade-insecure-requests directive as a safety net (see our security headers guide).",
    ],
    tools: ["Chrome DevTools Console", "Why No Padlock"],
    aiPrompt: "My website loads over HTTPS but some images, scripts, or stylesheets are still referenced over HTTP, causing mixed content warnings in browsers. Can you help me find all HTTP resource references and update them to HTTPS or protocol-relative URLs?",
  },

  // ── UX & Conversion ─────────────────────────────────────────────────────
  "call-to-action": {
    slug: "call-to-action",
    title: "Add a clear call-to-action",
    category: "UX & Conversion",
    summary: "One obvious button that tells visitors exactly what to do next.",
    whatItMeans:
      "A call-to-action (CTA) is the primary button you want every visitor to click — 'Get a quote', 'Book a demo', 'Start free trial'. Pages without one leave the visitor to figure out the next step alone.",
    whyItMatters:
      "The CTA is the single biggest conversion lever on any page. Visitors rarely hunt for how to buy or contact you; if the action isn't obvious within seconds, they leave.",
    steps: [
      "Choose the one action that matters most on this page — a page can have multiple buttons, but they should all lead to the same journey.",
      "Place it above the fold (visible without scrolling) and repeat it at the bottom.",
      "Write specific text: 'Get my free quote' beats 'Submit' or 'Learn more'.",
      "Make it look clickable: high-contrast colour, generous padding, rounded corners — it should be the most visually prominent element on the page.",
      "On mobile, keep it thumb-reachable and at least ~44px tall.",
    ],
    tools: ["Our conversion score tab", "A/B testing tool (later)"],
    aiPrompt: "My website's landing page has no clear call-to-action or uses weak generic text like 'Submit' or 'Learn more'. Can you help me write specific, action-oriented CTA copy and explain the best placement and visual treatment to maximise click-through?",
  },
  "trust-signals": {
    slug: "trust-signals",
    title: "Add trust signals",
    category: "UX & Conversion",
    summary: "Reviews, guarantees, and credentials that make strangers comfortable buying.",
    whatItMeans:
      "Trust signals are visible proof that real people and institutions vouch for you: testimonials, review scores, client logos, certifications, secure-payment badges, and guarantees.",
    whyItMatters:
      "Visitors arriving from search don't know you. Without visible proof others survived the experience, most will not hand over money or contact details — no matter how good the offer looks.",
    steps: [
      "Add 2–3 real customer testimonials near your CTA — with names, photos, and specifics ('doubled our leads in 2 months').",
      "Show aggregate review scores with the source (Google, Trustpilot, Capterra) rather than anonymous stars.",
      "Display the logos of known clients or certifications you hold.",
      "Add a guarantee or refund policy near the buy button — it removes the perceived risk of acting.",
    ],
    tools: ["Our conversion score tab", "Review platforms (Trustpilot, Google Reviews)"],
    aiPrompt: "My website lacks visible trust signals — no reviews, testimonials, security badges, or guarantees — which is likely causing visitors to leave without converting. Can you list the most effective trust elements to add, where to place them on the page, and what they should say to reduce buying anxiety?",
  },
  "social-proof": {
    slug: "social-proof",
    title: "Show social proof",
    category: "UX & Conversion",
    summary: "Numbers and voices of other customers — 'Join 4,000 teams' beats any slogan.",
    whatItMeans:
      "Social proof is evidence that other people chose you: customer counts, reviews, case studies, user-generated content, or a live 'recently purchased' stream.",
    whyItMatters:
      "People copy people. Showing that others already took the leap reduces the perceived risk of being the first, and it's the cheapest credibility you can add to a page.",
    steps: [
      "Lead with a number if you have one: 'Trusted by 4,000+ shops' under the hero headline.",
      "Embed 3 of your best reviews (with real names/faces) near the CTA.",
      "Link one short case study with a concrete result.",
      "Refresh it — a 'as featured in' strip from 2017 reads as neglect.",
    ],
    tools: ["Our conversion score tab"],
    aiPrompt: "My website has no social proof — no customer reviews, user counts, or testimonials to reassure first-time visitors. Can you explain the most effective types of social proof for my site type [SaaS / e-commerce / service business], how to collect it, and where it should appear on the page?",
  },
  "mobile-friendliness": {
    slug: "mobile-friendliness",
    title: "Make the site work on mobile",
    category: "UX & Conversion",
    summary: "Readable text, tap-sized buttons, and no horizontal scrolling on phones.",
    whatItMeans:
      "Mobile readiness means the layout adapts to a small screen: text is legible without zooming, buttons are big enough for thumbs, and nothing forces sideways scrolling.",
    whyItMatters:
      "Most of your visitors are on phones, Google ranks you on your mobile site, and a broken mobile layout converts essentially nobody who arrives on one.",
    steps: [
      "Open the site on a real phone and list what breaks: overlapping text, cut-off forms, tiny buttons, horizontal scroll.",
      "Ensure the viewport meta tag is present (see our viewport guide).",
      "Use responsive layout rules (CSS media queries or your builder's mobile settings) — never fixed pixel widths for main containers.",
      "Make tap targets at least 44×44px with space between them.",
      "Fix the worst offender first, re-test, repeat — mobile issues are usually a handful of repeating patterns.",
    ],
    tools: ["Chrome DevTools device toolbar", "PageSpeed Insights"],
    aiPrompt: "My website fails Google's mobile-friendliness test — buttons are too small to tap, text requires zooming, or the layout breaks on small screens. Can you walk me through the specific CSS and HTML changes needed to pass the test, and show me how to verify with Chrome DevTools?",
  },
  "contact-info": {
    slug: "contact-info",
    title: "Make contact information easy to find",
    category: "UX & Conversion",
    summary: "A visible email, phone, or form — the minimum a stranger needs to reach you.",
    whatItMeans:
      "Contact info in the header, footer, or a dedicated page tells visitors a real person is reachable. Its absence reads as a signal the site may not be a real business.",
    whyItMatters:
      "Visitors who can't instantly see how to reach you assume there's a reason you're hiding it. It also costs you the high-intent visitors who were ready to talk.",
    steps: [
      "Put an email address or phone number in the site footer on every page (and in the header if sales-driven).",
      "Use a contact form with as few fields as possible — name, email, message is enough.",
      "Make phone numbers and emails clickable (tel: and mailto: links) — half of mobile visitors will tap them.",
      "Add a Contact page and link it in the main navigation or footer.",
    ],
    tools: ["Our UX tab"],
    aiPrompt: "My website makes it hard for visitors to contact me — there's no visible phone, email, or contact form in an obvious location. Can you tell me exactly where contact information should appear, what options to offer, and how to make phone and email links clickable on mobile?",
  },
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Add a privacy policy",
    category: "Security",
    summary: "Legally required in most jurisdictions, and a visible honesty signal.",
    whatItMeans:
      "A privacy policy explains what data you collect and what you do with it. GDPR/CCPA require one if you have any visitors from those regions, and every analytics or ad tool's terms require it too.",
    whyItMatters:
      "Beyond legal exposure, missing privacy policies fail trust reviews, block ad-platform approval, and make the site look unfinished to careful buyers.",
    steps: [
      "Generate a baseline policy with a free generator (Termly, iubenda, or your national data authority's template).",
      "Adapt it to reality: list the analytics/ad tools you actually use and any contact form storage.",
      "Publish it at /privacy and link it in the footer of every page.",
      "If you use cookies for analytics or ads, add a consent banner (we do — see the banner on this site).",
    ],
    tools: ["Termly", "iubenda", "Google Privacy & Terms generator"],
    aiPrompt: "My website collects email addresses, uses cookies, and has Google Analytics, but has no privacy policy page. Can you explain what a privacy policy must cover for a small website under GDPR/CCPA and help me draft the key sections (data collection, cookies, user rights, contact)?",
  },
  "message-clarity": {
    slug: "message-clarity",
    title: "Clarify what the site offers",
    category: "UX & Conversion",
    summary: "A stranger should know what you do, for whom, within five seconds.",
    whatItMeans:
      "Clarity measures whether the hero section instantly answers 'what is this, who is it for, and why should I care'. Clever slogans and jargon score low; concrete statements score high.",
    whyItMatters:
      "Visitors give a new page a few seconds. If they can't tell what you offer, they don't scroll further or click anything — every other improvement on the page is wasted.",
    steps: [
      "Rewrite the hero headline to the formula: what you do + for whom + the outcome ('Wedding photography for couples who hate posing').",
      "Add a one-sentence subheadline with the concrete benefit.",
      "Replace industry jargon with the words customers actually use.",
      "Show, don't claim: one product screenshot or photo of the service in action beats a paragraph of adjectives.",
      "Test on someone outside your industry: can they repeat what you offer after five seconds?",
    ],
    tools: ["Our conversion score tab"],
    aiPrompt: "My website's main message is unclear — visitors can't tell what I offer, who it's for, or what to do next within the first five seconds. Can you help me write a hero headline and sub-headline that passes the '5-second test' and makes the value proposition immediately obvious?",
  },
  "conversion-friction": {
    slug: "conversion-friction",
    title: "Reduce conversion friction",
    category: "UX & Conversion",
    summary: "Every extra field, step, and click between desire and action loses people.",
    whatItMeans:
      "Friction is the effort your signup, checkout, or contact flow demands: number of fields, steps, account requirements, and surprises like unexpected costs.",
    whyItMatters:
      "Industry benchmarks lose roughly a quarter of users at each unnecessary step. High-friction flows silently discard the visitors your content worked so hard to win.",
    steps: [
      "Count the fields in your main form — remove every one you don't strictly need (phone, company, 'how did you hear about us' go first).",
      "Allow guest checkout / contact without account creation; ask for account details after the transaction.",
      "Show all costs early — surprise shipping or fees at the last step is the classic conversion killer.",
      "Enable browser autofill and show progress indicators on multi-step forms.",
      "Test the flow on a phone: if it's painful there, it's losing most of your conversions.",
    ],
    tools: ["Our conversion score tab", "Hotjar/Clarity session recordings"],
    aiPrompt: "My website's conversion flow has too many steps, form fields, or hidden costs that make visitors give up before completing the action. Can you identify the most common friction points in signup and checkout flows and show me how to simplify each one?",
  },
  "generic-copy": {
    slug: "generic-copy",
    title: "Replace generic marketing copy",
    category: "Content",
    summary: "'World-class solutions' describes nobody — specifics describe you.",
    whatItMeans:
      "Generic copy is text that could appear on any competitor's site unchanged: 'innovative solutions', 'best-in-class service', 'we're passionate about quality'. Readers' eyes slide over it because it carries no information.",
    whyItMatters:
      "Visitors use specificity to judge credibility. Concrete claims ('installed in 2 hours', '4.9★ from 300 reviews') are believable and memorable; generic claims are neither.",
    steps: [
      "Find every phrase that would survive a competitor pasting it — those are your targets.",
      "Replace each with a number, name, or concrete outcome: 'same-day service in Leeds' not 'fast local service'.",
      "Rewrite the hero headline last, using the clarity formula (what + who + outcome).",
      "Read the page aloud — if you'd skip the sentence in a real conversation, cut or sharpen it.",
    ],
    tools: ["Our vague language tab", "Hemingway Editor"],
    aiPrompt: "My website uses vague marketing language like 'world-class', 'cutting-edge', and 'innovative solutions' that visitors skip over because it carries no real information. Can you help me rewrite the following copy to be concrete, specific, and benefit-focused? [paste your text here]",
  },
  "security-headers": {
    slug: "security-headers",
    title: "Add missing security headers",
    category: "Security",
    summary: "A few lines of server config that block common attacks and remove browser warnings.",
    whatItMeans:
      "Security headers are instructions your server sends with every page telling browsers to enforce protections: restricting scripts (Content-Security-Policy), forbidding framing (X-Frame-Options), forcing HTTPS, and more.",
    whyItMatters:
      "Headers are invisible when present and a liability when missing: clickjacking, script injection, and protocol downgrade attacks all rely on their absence. Security scanners and enterprise customers check them.",
    steps: [
      "Start with the easy wins in your server config or CDN rules: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, and Strict-Transport-Security.",
      "Add a Content-Security-Policy gradually: start in report-only mode, watch the console, then enforce.",
      "On Cloudflare, 'Transform Rules' or a Worker can set headers without touching your app; on Nginx use add_header; on Netlify/Vercel use headers config files.",
      "Verify with securityheaders.com until you score A.",
    ],
    tools: ["securityheaders.com", "Mozilla Observatory"],
    stepImages: {
      0: { src: "/guides/security-headers-response.svg", caption: "The four headers to start with, exactly as your server should send them." },
      3: { src: "/guides/securityheaders-scan.png", caption: "Paste your URL at securityheaders.com for an instant grade." },
    },
    aiPrompt: "My website is missing important HTTP security headers like Content-Security-Policy, X-Frame-Options, and Strict-Transport-Security that protect visitors from attacks. Can you show me the exact header values to add and how to configure them for [nginx / Apache / Cloudflare / Vercel / Netlify]?",
  },
  "stale-content": {
    slug: "stale-content",
    title: "Refresh stale content",
    category: "Content",
    summary: "Old copyright years and dated posts quietly tell visitors the site is neglected.",
    whatItMeans:
      "Freshness signals include copyright years, publish dates, prices, and references to events. Content that visibly predates the last couple of years suggests the business behind it may be equally stale.",
    whyItMatters:
      "Buyers check dates before trusting advice or prices, and Google favours pages it considers maintained. A refresh of old pages is also far cheaper than writing new ones.",
    steps: [
      "Update the footer copyright year (make it dynamic so it never goes stale again).",
      "Review your top pages: fix old prices, screenshots, dates, and dead references.",
      "Refresh and re-publish your best old posts with updated information — keep the URL, update the date.",
      "Remove or redirect pages for products you no longer offer.",
    ],
    tools: ["Our freshness tab", "Google Search Console (pages losing traffic)"],
    aiPrompt: "My website's content looks outdated — old copyright years, dated screenshots, and references to past events make it appear abandoned. Can you give me a content audit process and a prioritised list of what to update first to signal freshness to visitors and search engines?",
  },
  "reading-level": {
    slug: "reading-level",
    title: "Simplify overly complex content",
    category: "Content",
    summary: "Most web copy should be readable at roughly Grade 8 — clear, short, direct.",
    whatItMeans:
      "Reading level estimates the education needed to follow your text. 'Advanced' usually means long sentences, dense paragraphs, and jargon — not that your audience is stupid, but that the writing makes them work.",
    whyItMatters:
      "Even expert readers skim web pages. Plain language is read by more people, understood by more people, and converts more people — every serious style guide for the web says the same thing.",
    steps: [
      "Aim for sentences under ~20 words and one idea per sentence.",
      "Replace jargon with the word your customer would use.",
      "Break walls of text into short paragraphs with descriptive subheadings.",
      "Use bullet lists for options and steps (you're reading one now).",
      "Run the page through Hemingway and fix the red/yellow highlights.",
    ],
    tools: ["Hemingway Editor", "Our content tab"],
    aiPrompt: "My website's copy is too complex — long sentences, industry jargon, and dense paragraphs that most visitors won't read. Can you help me simplify the following text to a clear reading level suitable for a general audience while keeping the meaning intact? [paste your text here]",
  },
  "search-intent": {
    slug: "search-intent",
    title: "Match content to search intent",
    category: "SEO",
    summary: "Give searchers the page they were actually looking for when they typed the query.",
    whatItMeans:
      "Search intent is the goal behind a query: someone searching 'how to fix a leaky tap' wants a guide; 'plumber near me' wants a service page. Intent misalignment means your page answers a different question than the one visitors arrived with.",
    whyItMatters:
      "Google ranks pages that satisfy the searcher's intent and demotes pages people immediately bounce from. Misaligned content gets neither rankings nor conversions no matter how well written it is.",
    steps: [
      "Search your target keyword in an incognito window and study the top 5 results — their page type (guide, product, tool, pricing) IS the intent.",
      "Compare with your page: if the results are how-to guides and yours is a sales page, rebuild it to match the dominant type.",
      "Answer the searcher's actual question in the first screen — don't make them dig for it.",
      "Cover the sub-questions searchers obviously have next (the 'People also ask' boxes are a cheat sheet).",
    ],
    tools: ["Google Search Console", "'People also ask' boxes"],
    aiPrompt: "My page targets a keyword but the content doesn't match what people searching that term actually want — visitors bounce immediately. Can you help me diagnose the intent mismatch and restructure the page to match what searchers are really looking for when they type that query?",
  },
  "broken-links": {
    slug: "broken-links",
    title: "Fix broken links",
    category: "SEO",
    summary: "Dead links leak ranking power and tell visitors the site isn't maintained.",
    whatItMeans:
      "A broken link points to a page that no longer exists (404). They accumulate naturally as other sites reorganise or as you rename your own pages.",
    whyItMatters:
      "Broken internal links waste Google's crawl budget and dilute rankings; broken external links to your own moved pages frustrate exactly the visitors who were most engaged.",
    steps: [
      "Open our SEO tab — it lists every broken link found with its location.",
      "Fix internal links first: update the URL, or add a 301 redirect from the old address to the new one.",
      "For links to other people's dead pages, either remove the link or replace it with a working source.",
      "Set up a recurring check (our re-run, or a crawler like Screaming Frog) — link rot returns.",
    ],
    tools: ["Our SEO tab", "Screaming Frog", "Ahrefs broken link report"],
    aiPrompt: "My website has broken links returning 404 errors that damage user experience and waste crawl budget. Can you give me a step-by-step process to audit all my links, decide what to do with each broken one (redirect, remove, or replace), and prevent the same issue recurring?",
  },

  // ── New: Technical SEO & Performance ─────────────────────────────────────
  "sitemap": {
    slug: "sitemap",
    title: "Create and submit an XML sitemap",
    category: "SEO",
    summary: "Tell search engines exactly which pages to index with a machine-readable sitemap.",
    whatItMeans:
      "An XML sitemap is a file at /sitemap.xml that lists all your important pages, their last-modified dates, and how often they change. Search engines read it to discover content they might otherwise miss — especially on large sites or sites with few internal links.",
    whyItMatters:
      "Without a sitemap, search engines rely on crawling links to find pages. New or orphaned pages can go unindexed for weeks. A sitemap also lets you signal priority and freshness, giving you control over how Googlebot spends its crawl budget.",
    steps: [
      "Generate the sitemap: most CMS platforms (WordPress, Shopify, Webflow) do this automatically — check Settings or install a plugin like Yoast SEO or Rank Math.",
      "For custom sites, use a sitemap generator tool (xml-sitemaps.com or a build-step library) or write the XML manually — each <url> entry needs a <loc> and ideally a <lastmod>.",
      "Place the file at https://yourdomain.com/sitemap.xml and verify it's publicly accessible.",
      "Reference the sitemap in your robots.txt file: add the line Sitemap: https://yourdomain.com/sitemap.xml at the bottom.",
      "Submit the sitemap in Google Search Console (Indexing → Sitemaps → Add). This triggers Googlebot to process it immediately.",
      "Exclude low-value pages: no-index pages, pagination, filtered URLs, and admin paths should not appear in the sitemap.",
    ],
    tools: ["Google Search Console", "Yoast SEO (WordPress)", "xml-sitemaps.com"],
    aiPrompt: "My website doesn't have an XML sitemap or hasn't submitted one to Google Search Console, which may be limiting how many pages get indexed. Can you walk me through generating a sitemap for [WordPress / static site / Next.js], adding it to robots.txt, and submitting it in Search Console?",
  },

  "hreflang": {
    slug: "hreflang",
    title: "Implement hreflang for international pages",
    category: "SEO",
    summary: "Tell search engines which language/region version of a page to show each visitor.",
    whatItMeans:
      "Hreflang is an HTML attribute that tells Google which version of a page targets which language and country. Without it, Google may show the wrong language version in search results — showing your English page to French users, for example.",
    whyItMatters:
      "Incorrect or missing hreflang causes duplicate content penalties and sends the wrong language version to the wrong users, increasing bounce rate. It is the single most impactful technical fix for internationally-targeted sites.",
    steps: [
      "Decide your URL structure: separate domains (fr.example.com), subdirectories (/fr/), or subdomains are all valid — subdirectories are easiest to manage.",
      "Add hreflang link tags in the <head> of every page variant, including a self-referencing tag: <link rel=\"alternate\" hreflang=\"en\" href=\"https://example.com/page\" />",
      "Always include an x-default tag for the fallback language: <link rel=\"alternate\" hreflang=\"x-default\" href=\"https://example.com/page\" />",
      "Every page in the cluster must link to every other page — hreflang is bidirectional and breaks silently if any side is missing.",
      "Validate using Google Search Console (International Targeting report) or the hreflang validator at ahrefs.com/hreflang.",
      "If you have many pages, implement hreflang via the XML sitemap instead of the HTML head — it scales better and is equally supported by Google.",
    ],
    tools: ["Google Search Console → International Targeting", "Ahrefs Hreflang Checker", "hreflangvalidator.com"],
    aiPrompt: "My website serves content in multiple languages but has no hreflang tags, so Google may show the wrong language version to users from different regions. Can you show me the exact hreflang link elements to add to each variant, the self-referencing format, and the x-default fallback?",
  },

  "font-loading": {
    slug: "font-loading",
    title: "Optimise web font loading",
    category: "Performance",
    summary: "Prevent invisible or mismatched text while fonts load by preloading and using font-display.",
    whatItMeans:
      "When a browser encounters a custom font, it can either show invisible text (FOIT — Flash of Invisible Text) or show the fallback font first and swap when the custom font arrives (FOUT — Flash of Unstyled Text). By default, most browsers choose FOIT, which makes text disappear for up to 3 seconds on slow connections.",
    whyItMatters:
      "Font loading directly impacts LCP and CLS. Invisible text delays LCP. A font swap that shifts layout increments CLS. Both are Core Web Vitals that Google measures in ranking. Optimised font loading can improve your Lighthouse performance score by 5–15 points.",
    steps: [
      "Add font-display: swap to every @font-face rule so the browser shows fallback text immediately instead of hiding it.",
      "Preload your most important font files: <link rel=\"preload\" href=\"/fonts/your-font.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>",
      "Self-host fonts instead of loading from Google Fonts — this removes one external DNS lookup and connection. Use google-webfonts-helper.herokuapp.com to download the files.",
      "Only load the font weights and styles you actually use — every unused variant is a wasted download.",
      "Use a system font stack as your fallback and tweak its metrics (size-adjust, ascent-override, descent-override) to minimise layout shift when your custom font swaps in.",
      "Subset your fonts to only the characters used on the page using pyftsubset or a build tool — this can cut font file size by 50–80%.",
    ],
    tools: ["Google Fonts (font-display parameter)", "google-webfonts-helper", "Fontaine (automatic fallback metrics)"],
    aiPrompt: "My website uses custom web fonts that are causing a flash of invisible text (FOIT) or layout shifts when the font loads. Can you show me how to add font-display: swap, preload the key font files, and configure a close fallback font to minimise the visual disruption?",
  },

  "caching": {
    slug: "caching",
    title: "Set up browser caching for faster repeat visits",
    category: "Performance",
    summary: "Configure Cache-Control headers so returning visitors load your site from memory instead of the network.",
    whatItMeans:
      "Browser caching tells a visitor's browser to store a copy of your assets (images, CSS, JS) locally for a set period. On repeat visits, the browser loads those assets instantly from disk instead of downloading them again. For most sites, 60–80% of assets can be cached.",
    whyItMatters:
      "Repeat visitors are your warmest audience — subscribers, returning customers, people who bookmarked you. A slow repeat-visit experience loses real conversions. Caching also reduces your server and CDN bandwidth costs significantly.",
    steps: [
      "Set long cache durations (1 year) for versioned assets — files whose name or URL includes a hash or version number: Cache-Control: public, max-age=31536000, immutable",
      "Set shorter durations (1 hour to 1 day) for unversioned assets like your HTML, sitemap, and robots.txt: Cache-Control: public, max-age=3600",
      "Use a CDN (Cloudflare, Fastly, or your host's built-in CDN) — they cache at the network edge and serve assets from a location close to the visitor.",
      "If on Apache, add caching rules in .htaccess. On nginx, add expires directives. On Cloudflare, Rules → Cache Rules handles it without touching your server.",
      "Test your headers with Chrome DevTools → Network → select any asset → Headers tab → look for Cache-Control and Age.",
      "Verify with Google PageSpeed Insights — the 'Serve static assets with an efficient cache policy' audit lists every under-cached resource.",
    ],
    tools: ["Chrome DevTools → Network tab", "PageSpeed Insights", "Cloudflare Cache Rules"],
    aiPrompt: "My website isn't setting proper Cache-Control headers on static assets, so returning visitors have to re-download everything on each visit. Can you give me the exact header values for different asset types and show me how to configure them on [nginx / Apache / Cloudflare / Vercel]?",
  },

  "redirect-chains": {
    slug: "redirect-chains",
    title: "Fix redirect chains and loops",
    category: "SEO",
    summary: "Replace multi-hop redirects with direct ones to preserve link equity and speed up page loads.",
    whatItMeans:
      "A redirect chain is when URL A redirects to URL B, which redirects to URL C. Each hop adds latency and dilutes the PageRank passed through the redirect. A redirect loop is when the chain eventually points back to itself — causing an infinite loop error in browsers and bots.",
    whyItMatters:
      "Each redirect hop adds 100–300ms of latency before the page loads. Googlebot follows redirect chains but passes less link equity with each hop. A chain of 3+ redirects can cause Googlebot to abandon the chain entirely, leaving your canonical page unindexed.",
    steps: [
      "Audit your redirects using Screaming Frog (Spider → Response Codes → Redirection) or Ahrefs Site Audit — both flag chains and loops automatically.",
      "Update every redirect in the chain to point directly to the final destination. If A→B→C, change A to redirect to C and remove the intermediate hop.",
      "Update any internal links or hardcoded URLs that point to the old intermediate URLs — eliminating the need for the redirect entirely is always better than fixing the chain.",
      "For WordPress: use the Redirection plugin to manage all your redirects in one place. For custom sites: centralise redirects in nginx.conf, .htaccess, or a middleware file.",
      "Check your XML sitemap — it should only contain final, canonical URLs, not redirecting ones.",
      "After fixing, verify the chain is gone: curl -IL https://yourdomain.com/old-url should resolve in one or two hops maximum.",
    ],
    tools: ["Screaming Frog SEO Spider", "Ahrefs Site Audit", "httpstatus.io (single URL checker)"],
    aiPrompt: "My website has redirect chains where URL A redirects to B which then redirects to C, wasting load time and diluting SEO link equity. Can you help me audit my redirects, update each one to point directly to the final destination, and verify no chains remain?",
  },

  "internal-linking": {
    slug: "internal-linking",
    title: "Improve internal linking structure",
    category: "SEO",
    summary: "Connect your pages with meaningful anchor text so search engines understand your site's hierarchy.",
    whatItMeans:
      "Internal links are links between pages on your own site. They pass PageRank from high-authority pages to deeper pages, signal to search engines which pages are most important, and help visitors navigate to related content. A flat site with no internal linking is harder for both users and bots to explore.",
    whyItMatters:
      "Pages with no internal links pointing to them (orphan pages) are rarely indexed. Pages that receive many internal links with relevant anchor text rank higher for those terms. Internal linking is one of the highest-ROI, zero-cost SEO improvements available to any site.",
    steps: [
      "Identify your most important pages (money pages, cornerstone content) — these should receive the most internal links from other pages.",
      "Link from high-traffic or high-authority pages to your important pages using descriptive anchor text that includes the target keyword — not 'click here'.",
      "Find orphan pages using Screaming Frog (Bulk Export → All Inlinks — filter for pages with 0 inlinks) and add at least one internal link to each.",
      "Add contextual links from blog posts or guide pages to relevant product or service pages where the context is genuinely helpful.",
      "Build a hub structure: create one comprehensive page per topic (pillar page) and link all related articles back to it. This concentrates authority on the topic page.",
      "Audit your navigation — every page in your main nav gets a free internal link from every other page. Make sure the nav links to your most important pages, not just the most recent ones.",
    ],
    tools: ["Screaming Frog SEO Spider", "Ahrefs Internal Link Opportunities", "Google Search Console → Links"],
    aiPrompt: "Several pages on my website have few or no internal links pointing to them, making them hard for search engines and visitors to discover. Can you show me how to build an effective internal linking strategy, find orphaned pages, and add contextual links using descriptive anchor text?",
  },
};

export const CATEGORY_ORDER: GuideCategory[] = ["Performance", "SEO", "UX & Conversion", "Security", "Content"];

/**
 * Maps a scanner issue ID (from computePriorityIssues) to its guide, if one
 * exists. Handles the dynamic seo-fail-<checkId> / seo-warn-<checkId> forms
 * by looking up the underlying SEO check.
 */
const SEO_CHECK_GUIDES: Record<string, string> = {
  https: "https",
  mixed_content: "mixed-content",
  title: "page-title",
  meta_desc: "meta-description",
  canonical: "canonical-url",
  h1_count: "h1-heading",
  img_alt: "image-alt-text",
  og_tags: "open-graph-tags",
  schema: "structured-data",
  viewport: "viewport-meta",
  robots: "robots-directive",
  hreflang: "hreflang",
  sitemap: "sitemap",
};

const ISSUE_GUIDES: Record<string, string> = {
  "broken-links": "broken-links",
  "lcp-poor": "lcp",
  "lcp-fair": "lcp",
  "cls-poor": "cls",
  "tbt-poor": "tbt",
  "perf-poor": "mobile-performance",
  "perf-fair": "mobile-performance",
  "image-format": "image-formats",
  "lazy-loading": "lazy-loading",
  "render-blocking": "render-blocking-resources",
  "no-cta": "call-to-action",
  "weak-cta": "call-to-action",
  "no-trust": "trust-signals",
  "low-trust-score": "trust-signals",
  "no-social-proof": "social-proof",
  "not-mobile": "mobile-friendliness",
  "no-contact": "contact-info",
  "no-privacy": "privacy-policy",
  "low-clarity": "message-clarity",
  "high-friction": "conversion-friction",
  "generic-copy": "generic-copy",
  "vague-copy": "generic-copy",
  "security-headers": "security-headers",
  "stale-content": "stale-content",
  "complex-content": "reading-level",
  "low-intent": "search-intent",
  "font-loading": "font-loading",
  "slow-fonts": "font-loading",
  "no-caching": "caching",
  "redirect-chain": "redirect-chains",
  "no-internal-links": "internal-linking",
};

export function guideForIssue(issueId: string): Guide | null {
  const direct = ISSUE_GUIDES[issueId];
  if (direct && GUIDES[direct]) return GUIDES[direct];

  // seo-fail-<checkId> / seo-warn-<checkId>
  const match = issueId.match(/^seo-(?:fail|warn)-(.+)$/);
  if (match) {
    const slug = SEO_CHECK_GUIDES[match[1]];
    if (slug && GUIDES[slug]) return GUIDES[slug];
  }
  return null;
}
