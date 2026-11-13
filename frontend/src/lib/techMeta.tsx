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
  "framework":  { label: "Framework",      defaultDesc: "Framework, library, or server software this site is built on." },
  "analytics":  { label: "Analytics",      defaultDesc: "Tracks visitor behavior, engagement, and conversion events." },
  "cdn":        { label: "Hosting and CDN", defaultDesc: "Hosting, delivery network, or edge service this site is served through." },
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

  "Amazon CloudFront": "Amazon's CDN integrated with the AWS ecosystem.",
  "AWS S3":            "Amazon's file storage, here serving the site's pages or assets.",
  "AWS Elastic Load Balancing": "Amazon's load balancer spreading visitors across several servers.",
  "Microsoft Azure":   "Microsoft's cloud platform hosting this site.",
  "Google Cloud":      "Google's cloud platform, here routing traffic to the site.",
  "GitHub Pages":      "Free static site hosting served straight from a GitHub repository.",
  "Heroku":            "Cloud platform that runs web apps without managing servers.",
  "Fly.io":            "Platform that runs apps on servers close to their visitors.",
  "Railway":           "Cloud platform for deploying apps and databases from a repository.",
  "Render":            "Cloud platform for hosting web apps, APIs, and static sites.",
  "Kinsta":            "Managed WordPress hosting on Google Cloud.",
  "WP Engine":         "Managed hosting built for WordPress sites.",
  "Pantheon":          "Managed hosting for WordPress and Drupal sites.",
  "Plesk":             "Hosting control panel used to manage this server.",
  "BunnyCDN":          "Low-cost CDN delivering the site from edge locations.",
  "KeyCDN":            "CDN delivering the site's assets from edge locations.",
  "Imperva":           "Security layer that filters attacks and bots before they reach the site.",
  "Sucuri":            "Website firewall and CDN that blocks attacks and malware.",
  "DataDome":          "Bot protection that screens automated traffic.",
  "PerimeterX":        "Bot protection that screens automated traffic.",
  "DDoS-Guard":        "Protection service that absorbs denial-of-service attacks.",
  "F5 BIG-IP":         "Enterprise load balancer and security gateway in front of the site.",

  // Server-side frameworks and languages
  "Django":            "Python web framework with a built-in admin, ORM, and security defaults.",
  "Flask":             "Lightweight Python web framework for small apps and APIs.",
  "Laravel":           "PHP web framework known for expressive syntax and a large ecosystem.",
  "Ruby on Rails":     "Ruby web framework built around convention over configuration.",
  "ASP.NET":           "Microsoft's web framework for apps written in C#.",
  "Express.js":        "Minimal web framework for Node.js servers and APIs.",
  "Sails.js":          "Node.js framework for data-driven apps and APIs.",
  "Koa":               "Small Node.js web framework from the team behind Express.",
  "NextAuth.js":       "Sign-in library for Next.js apps, also known as Auth.js.",
  "CodeIgniter":       "Lightweight PHP web framework.",
  "CakePHP":           "PHP web framework built around convention over configuration.",
  "Yii":               "High-performance PHP framework for web applications.",
  "Play Framework":    "Web framework for Java and Scala applications.",
  "PHP":               "Server-side language that generates this site's pages.",
  "Python":            "Server-side language that generates this site's pages.",
  "Java":              "Server-side language and runtime behind this site.",
  "Deno":              "Modern JavaScript and TypeScript runtime for the server.",
  "Nuxt.js":           "Vue meta-framework with SSR, file-based routing, and modules.",

  // Web and application servers
  "Nginx":             "Web server and reverse proxy that answers visitors' requests.",
  "Apache":            "Long-established open-source web server.",
  "Apache Tomcat":     "Server that runs Java web applications.",
  "Jetty":             "Lightweight server that runs Java web applications.",
  "LiteSpeed":         "High-performance web server, common on shared hosting.",
  "OpenResty":         "Nginx-based web platform extended with Lua scripting.",
  "Tengine":           "Nginx-based web server maintained by Alibaba.",
  "lighttpd":          "Lightweight web server built for speed.",
  "Caddy":             "Web server with automatic HTTPS.",
  "Microsoft IIS":     "Microsoft's web server for Windows.",
  "Gunicorn":          "Application server that runs Python web apps.",
  "Uvicorn":           "Fast application server for modern Python web apps.",
  "Phusion Passenger": "Application server for Ruby, Python, and Node.js apps.",
  "Cowboy":            "Small web server for Erlang and Elixir apps.",
  "Envoy":             "Proxy that routes traffic between visitors and services.",
  "Kong":              "API gateway that sits in front of backend services.",
  "Varnish":           "Caching layer that serves stored copies of pages for speed.",

  // More CMS and shops
  "Moodle":            "Open-source learning platform for online courses.",
  "Typo3":             "Open-source enterprise CMS popular in Europe.",
  "1C-Bitrix":         "Commercial CMS and e-commerce platform.",
  "Craft CMS":         "Flexible CMS built for custom content models.",
  "Discourse":         "Open-source forum and community platform.",
  "DNN":               "CMS built on Microsoft's ASP.NET, formerly DotNetNuke.",
  "Sitecore":          "Enterprise CMS and digital experience platform.",
  "Strapi":            "Open-source headless CMS built on Node.js.",
  "PrestaShop":        "Open-source e-commerce platform popular in Europe.",
  "OpenCart":          "Open-source online store platform.",

  // UI / utility
  "Bootstrap":    "Popular CSS framework with pre-built responsive components.",
  "jQuery":       "Lightweight JavaScript library for DOM manipulation and AJAX.",
  "Tailwind CSS": "Utility-first CSS framework for rapid UI development.",
  "Tailwind":     "Utility-first CSS framework for rapid UI development.",
  "Alpine.js":    "Minimal JavaScript framework for adding behavior to HTML.",
  "HTMX":         "Lets you build modern UIs with HTML attributes: no JS required.",

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
