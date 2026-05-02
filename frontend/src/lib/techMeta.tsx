import type { TechItem } from "../types/analysis";

type CategoryMeta = {
  label: string;     // friendly category label
  defaultDesc: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  "ai-builder": { label: "AI Builder",     defaultDesc: "AI-assisted website builder used to create and manage this site." },
  "cms":        { label: "CMS",            defaultDesc: "Content management system powering the site's content and pages." },
  "ecommerce":  { label: "E-commerce",     defaultDesc: "Online store platform handling products, checkout, and payments." },
  "builder":    { label: "Site Builder",   defaultDesc: "No-code website builder used to design and host this site." },
  "framework":  { label: "Framework",      defaultDesc: "JavaScript framework or library powering the user interface." },
  "analytics":  { label: "Analytics",      defaultDesc: "Tracks visitor behavior, engagement, and conversion events." },
  "cdn":        { label: "CDN",            defaultDesc: "Content delivery network serving assets from edge locations worldwide." },
  "media":      { label: "Media",          defaultDesc: "Embedded media platform used for video or rich content." },
};

// Specific descriptions for popular technologies. Falls back to category default.
const TECH_DESC: Record<string, string> = {
  // CMS
  "WordPress":    "Open-source CMS powering nearly half of all websites globally.",
  "Drupal":       "Enterprise-grade open-source CMS built for large, complex sites.",
  "Joomla":       "Flexible open-source CMS for community sites and portals.",
  "Ghost":        "Modern publishing platform optimized for blogs and newsletters.",
  "HubSpot CMS":  "Integrated CMS bundled with HubSpot's marketing and CRM tools.",
  "Contentful":   "Headless CMS that delivers content via API to any frontend.",
  "Sanity":       "Real-time headless CMS with structured content and a custom studio.",

  // Frameworks
  "React":        "JavaScript library for building component-based user interfaces.",
  "Vue":          "Progressive JavaScript framework focused on incremental adoption.",
  "Angular":      "Full-featured framework from Google for building large web apps.",
  "Svelte":       "Compiler-based framework that ships minimal runtime JavaScript.",
  "Next.js":      "React meta-framework with SSR, routing, and server components.",
  "Nuxt":         "Vue meta-framework with SSR, file-based routing, and modules.",
  "Gatsby":       "React-based static site generator optimized for performance.",
  "Remix":        "Full-stack web framework focused on web standards and UX.",
  "Astro":        "Content-focused framework that ships zero JavaScript by default.",
  "Vite":         "Lightning-fast frontend build tool and dev server.",

  // E-commerce
  "Shopify":      "Hosted e-commerce platform powering millions of online stores.",
  "WooCommerce":  "WordPress plugin that turns any site into a full online store.",
  "BigCommerce":  "SaaS e-commerce platform built for growing brands.",
  "Magento":      "Open-source e-commerce platform for mid-to-large merchants.",
  "Stripe":       "Payment processing infrastructure for accepting cards online.",

  // Builders
  "Wix":          "Drag-and-drop website builder with hundreds of templates.",
  "Webflow":      "Visual web design tool that exports clean, production-ready code.",
  "Squarespace":  "All-in-one website builder known for design-first templates.",
  "Framer":       "AI-powered design tool that publishes responsive websites.",
  "Durable":      "AI website builder that generates a full site in under a minute.",

  // Analytics
  "Google Analytics 4": "Google's latest analytics platform with event-based tracking.",
  "Google Analytics":   "Web analytics tracking traffic, behavior, and conversions.",
  "Google Tag Manager": "Centralized tag management for analytics and marketing scripts.",
  "Meta Pixel":         "Facebook's conversion tracking pixel for ad targeting and attribution.",
  "HubSpot":            "Marketing, sales, and CRM platform with deep tracking integrations.",
  "Hotjar":             "Heatmaps, recordings, and surveys to understand user behavior.",
  "Intercom":           "Customer messaging platform with live chat and support tools.",
  "Segment":            "Customer data pipeline that routes events to analytics tools.",
  "Mixpanel":           "Product analytics focused on user behavior and funnels.",
  "Klaviyo":            "Email and SMS marketing platform built for e-commerce.",
  "Salesforce":         "Enterprise CRM and customer data platform.",
  "Zendesk":            "Customer service platform with ticketing, chat, and knowledge base.",

  // CDN
  "Cloudflare":   "Global CDN with security, DDoS protection, and edge compute.",
  "CloudFront":   "Amazon's CDN integrated with the AWS ecosystem.",
  "Akamai":       "Enterprise CDN serving a large share of internet traffic.",
  "Fastly":       "Real-time CDN with programmable edge logic.",
  "Vercel":       "Edge platform for deploying frontend frameworks like Next.js.",
  "Netlify":      "All-in-one platform for static sites and serverless functions.",
  "jsDelivr":     "Free public CDN serving npm packages and GitHub assets.",

  // UI / utility
  "Bootstrap":    "Popular CSS framework with pre-built responsive components.",
  "jQuery":       "Lightweight JavaScript library for DOM manipulation and AJAX.",
  "Tailwind CSS": "Utility-first CSS framework for rapid UI development.",
  "Tailwind":     "Utility-first CSS framework for rapid UI development.",
  "Alpine.js":    "Minimal JavaScript framework for adding behavior to HTML.",
  "HTMX":         "Lets you build modern UIs with HTML attributes — no JS required.",

  // Media
  "YouTube":      "Embedded YouTube videos for tutorials, demos, or marketing.",
  "Vimeo":        "Premium video hosting platform popular with creators and brands.",
};

export function getTechDescription(t: TechItem): string {
  return TECH_DESC[t.name] ?? CATEGORY_META[t.category]?.defaultDesc ?? "Detected on this page.";
}

export function getTechRoleLabel(t: TechItem): string {
  return CATEGORY_META[t.category]?.label ?? t.category;
}

/** Returns an SVG icon JSX element appropriate for the tech category. */
export function getTechIcon(category: string): React.ReactNode {
  const common = { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (category) {
    case "framework":
      return (
        <svg {...common}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      );
    case "cms":
      return (
        <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      );
    case "ecommerce":
      return (
        <svg {...common}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      );
    case "analytics":
      return (
        <svg {...common}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>
      );
    case "cdn":
      return (
        <svg {...common}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
      );
    case "builder":
    case "ai-builder":
      return (
        <svg {...common}><path d="M12 2L2 7l10 5 10-5-10-5z"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
      );
    case "media":
      return (
        <svg {...common}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      );
    default:
      return (
        <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
      );
  }
}
