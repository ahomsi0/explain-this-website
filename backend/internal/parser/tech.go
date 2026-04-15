package parser

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/publicsuffix"
)

type techPattern struct {
	name     string
	category string
	// confidence is a legacy prior used as a tiny bias in scoring.
	confidence string
	patterns   []string
	// requireAll: if true ALL patterns must match (AND logic) instead of any one
	requireAll bool
	// tagOnly: if true, patterns are only matched inside HTML tag attributes
	// (src=, href=, action=, data-*) — prevents false positives from marketing copy
	tagOnly bool
}

// techPatterns lists all detectable technologies with their HTML fingerprints.
var techPatterns = []techPattern{
	// CMS — use path/attribute signals only, never plain words
	{name: "WordPress", category: "cms", confidence: "high",
		patterns: []string{`generator" content="wordpress`, "/wp-content/", "/wp-includes/", "wp-json/wp/"}, tagOnly: true},
	{name: "Drupal", category: "cms", confidence: "high",
		patterns: []string{"drupal.js", "/sites/default/files/", "Drupal.settings"}, tagOnly: true},
	{name: "Joomla", category: "cms", confidence: "high",
		patterns: []string{"/media/jui/", "joomla!", "/components/com_"}, tagOnly: true},

	// Page builders / hosted
	{name: "Wix", category: "builder", confidence: "high",
		patterns: []string{"static.parastorage.com", "wixstatic.com"}},
	{name: "Webflow", category: "builder", confidence: "high",
		patterns: []string{"data-wf-page", "webflow.js", "assets.website-files.com"}},
	{name: "Squarespace", category: "builder", confidence: "high",
		patterns: []string{"static.squarespace.com", "squarespace-cdn.com"}},

	// E-commerce
	{name: "Shopify", category: "ecommerce", confidence: "high",
		// shopify-section / shopify-sections are injected into every Shopify store's HTML
		// regardless of which CDN is used (CloudFront, Shopify's own CDN, etc.).
		// window.Shopify is a JS global Shopify injects on every storefront.
		// cdn.shopify.com/s/files/ is the default Shopify asset CDN (absent when a custom CDN fronts the store).
		patterns: []string{
			"shopify-section",       // class/id present on every Shopify storefront section
			"window.shopify",        // JS global injected by Shopify
			"shopify.shop",          // window.Shopify.shop property
			"cdn.shopify.com/s/files/", // default Shopify asset CDN
			"shopify_analytics.js",
			"myshopify.com/cart",
		}},
	{name: "WooCommerce", category: "ecommerce", confidence: "high",
		patterns: []string{"/wc-api/", "wc_add_to_cart", "wc-block", "woocommerce-js"}},
	{name: "BigCommerce", category: "ecommerce", confidence: "high",
		patterns: []string{"bigcommercecdn.com", "cdn11.bigcommerce.com"}},
	{name: "Magento", category: "ecommerce", confidence: "high",
		patterns: []string{"x-magento-init", "mage/bootstrap", "mage.cookies", "mage-init"}},

	// JS Frameworks
	{name: "Next.js", category: "framework", confidence: "high",
		patterns: []string{"_next/static", "__NEXT_DATA__", "/_next/"}},
	{name: "Nuxt.js", category: "framework", confidence: "high",
		patterns: []string{"__nuxt", "/_nuxt/", "nuxt.js"}},
	// React — file/URL-based signals restricted to tag attributes so that tutorials
	// or documentation pages mentioning "react.production.min.js" in prose don't
	// trigger a false positive.
	{name: "React", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{
			"react.production.min.js", "react.development.js",
			"unpkg.com/react", "cdn.jsdelivr.net/npm/react", "/react@",
			"/static/js/main.", "/static/js/bundle.", "/static/js/vendors~",
		}},
	// React — DOM attributes and JS runtime globals that only appear in actual
	// React-rendered output (not reachable via copy-paste in body copy).
	{name: "React", category: "framework", confidence: "high",
		patterns: []string{
			"data-reactroot", "data-reactid", "data-react-helmet",
			"/@react-refresh", "__reactFiber", "react-dom",
		}},
	// Vite dev server — definitive signals, never appear on non-Vite sites
	{name: "Vite", category: "framework", confidence: "high",
		patterns: []string{"/@vite/client", "vite/modulepreload-polyfill"}},
	// Vite production runtime helpers are strong indirect signals.
	{name: "Vite", category: "framework", confidence: "medium",
		patterns: []string{"__vite__mapdeps", "vite:preloaderror", "/node_modules/.vite/"}},
	// Note: the former "low" rule (rel="modulepreload" + /assets/) was removed because
	// it produced false positives on Shopify, Astro, and any framework that serves
	// assets from /assets/ with modulepreload. The medium/high rules above are sufficient.
	// Vue — file references tagOnly; runtime globals don't need restriction.
	{name: "Vue", category: "framework", confidence: "medium",
		tagOnly: true,
		patterns: []string{"vue.min.js", "vue@"}},
	{name: "Vue", category: "framework", confidence: "medium",
		patterns: []string{"vue.runtime", "__vue__"}},
	// Angular — file reference tagOnly; ng-version and module paths are specific enough.
	{name: "Angular", category: "framework", confidence: "medium",
		tagOnly: true,
		patterns: []string{"angular.min.js"}},
	{name: "Angular", category: "framework", confidence: "medium",
		patterns: []string{"ng-version", "angular/core"}},
	{name: "Svelte", category: "framework", confidence: "high",
		patterns: []string{"__svelte", "svelte/"}},
	{name: "Gatsby", category: "framework", confidence: "high",
		patterns: []string{"___gatsby", "gatsby-chunk"}},
	{name: "Remix", category: "framework", confidence: "high",
		patterns: []string{"__remixContext", "remix-run"}},
	{name: "Astro", category: "framework", confidence: "high",
		patterns: []string{"astro-island", "astro-slot"}},

	// Analytics & Marketing
	{name: "Google Analytics 4", category: "analytics", confidence: "high",
		patterns: []string{"gtag/js?id=G-", "gtag('config', 'G-", `gtag("config", "G-`}},
	{name: "Google Analytics (UA)", category: "analytics", confidence: "high",
		patterns: []string{"google-analytics.com/analytics.js", "gtag('config', 'UA-", `gtag("config", "UA-`}},
	{name: "Google Tag Manager", category: "analytics", confidence: "high",
		patterns: []string{"googletagmanager.com/gtm.js", "googletagmanager.com/ns.html"}},
	{name: "Meta Pixel", category: "analytics", confidence: "high",
		patterns: []string{"connect.facebook.net/en_US/fbevents.js", "fbq('init'", `fbq("init"`}},
	{name: "HubSpot", category: "analytics", confidence: "high",
		patterns: []string{"js.hs-scripts.com", "js.hsforms.net", "js.hscta.net"}},
	{name: "Hotjar", category: "analytics", confidence: "high",
		patterns: []string{"static.hotjar.com", "script.hotjar.com"}},
	{name: "Intercom", category: "analytics", confidence: "high",
		patterns: []string{"widget.intercom.io", "intercomSettings"}},
	{name: "Segment", category: "analytics", confidence: "high",
		patterns: []string{"cdn.segment.com", "segment.io", "analytics.identify(", "analytics.track("}},
	{name: "Mixpanel", category: "analytics", confidence: "high",
		patterns: []string{"cdn.mxpnl.com", "mixpanel.com/libs", "mixpanel.init"}},
	{name: "Klaviyo", category: "analytics", confidence: "high",
		patterns: []string{"static.klaviyo.com", "klaviyo.com/media"}},
	{name: "Salesforce", category: "analytics", confidence: "high",
		patterns: []string{"pardot.com", "sfdcstatic.com", "force.com/resource"}},
	{name: "Zendesk", category: "analytics", confidence: "high",
		patterns: []string{"zdassets.com", "zendeskcdn.com", "static.zdassets.com"}},
	{name: "Stripe", category: "analytics", confidence: "high",
		patterns: []string{"js.stripe.com", "stripe.network", "stripe-js"}},
	{name: "Crisp Chat", category: "analytics", confidence: "high",
		patterns: []string{"client.crisp.chat", "crisp.chat/js"}},
	{name: "Tawk.to", category: "analytics", confidence: "high",
		patterns: []string{"embed.tawk.to", "tawk_api"}},

	// CDN / Infrastructure
	{name: "Cloudflare", category: "cdn", confidence: "medium",
		patterns: []string{"__cf_bm", "cloudflare.com/cdn-cgi", "cloudflareinsights.com"}},
	{name: "Amazon CloudFront", category: "cdn", confidence: "high",
		patterns: []string{"cloudfront.net"}},
	{name: "Akamai", category: "cdn", confidence: "high",
		patterns: []string{"akamaihd.net", "akamaized.net", "edgesuite.net"}},
	{name: "Fastly", category: "cdn", confidence: "high",
		patterns: []string{"fastly.net", "fastlylb.net"}},
	{name: "Vercel", category: "cdn", confidence: "high",
		patterns: []string{"vercel.app", "_vercel"}},
	{name: "Netlify", category: "cdn", confidence: "high",
		patterns: []string{"netlify.app", "netlify.com/js"}},
	{name: "jsDelivr", category: "cdn", confidence: "medium",
		patterns: []string{"cdn.jsdelivr.net"}},

	// UI Frameworks
	// Bootstrap and jQuery file names are frequently cited in tutorials and
	// download guides — restrict to tag attributes to avoid body-text false positives.
	{name: "Bootstrap", category: "framework", confidence: "medium",
		tagOnly: true,
		patterns: []string{"bootstrap.min.css", "bootstrap.min.js", "bootstrap@"}},
	{name: "jQuery", category: "framework", confidence: "medium",
		tagOnly: true,
		patterns: []string{"jquery.min.js", "jquery-", "/jquery/"}},
	{name: "Tailwind CSS", category: "framework", confidence: "medium",
		patterns: []string{"tailwindcss", "cdn.tailwindcss.com"}},
	{name: "Alpine.js", category: "framework", confidence: "high",
		patterns: []string{"alpinejs", "cdn.jsdelivr.net/npm/alpinejs", "x-cloak"}},
	{name: "HTMX", category: "framework", confidence: "high",
		patterns: []string{"htmx.org", "unpkg.com/htmx"}},

	// Media / Embeds — correct category
	{name: "YouTube Embed", category: "media", confidence: "high",
		patterns: []string{"youtube.com/embed", "youtube-nocookie.com/embed"}},
	{name: "Vimeo Embed", category: "media", confidence: "high",
		patterns: []string{"player.vimeo.com/video", "vimeo.com/video"}},

	// Additional CMS
	{name: "Ghost", category: "cms", confidence: "high",
		patterns: []string{"ghost.io/", "ghost/core", "ghost-sdk"}},
	{name: "HubSpot CMS", category: "cms", confidence: "high",
		patterns: []string{"hubspot-web-interactives", "hs-sites.com", "hubspotusercontent.com"}},
	{name: "Contentful", category: "cms", confidence: "high",
		patterns: []string{"contentful.com/", "cdn.contentful.com"}},
	{name: "Sanity", category: "cms", confidence: "high",
		patterns: []string{"sanity.io/", "cdn.sanity.io"}},
	{name: "Strapi", category: "cms", confidence: "high",
		patterns: []string{"strapi.io", "/strapi/"}},
	{name: "Prismic", category: "cms", confidence: "high",
		patterns: []string{"prismic.io", "cdn.prismic.io"}},
	{name: "Storyblok", category: "cms", confidence: "high",
		patterns: []string{"storyblok.com", "a.storyblok.com"}},
	{name: "Typo3", category: "cms", confidence: "high",
		patterns: []string{"typo3", "typo3conf/", "t3lib/"}},
	{name: "Craft CMS", category: "cms", confidence: "high",
		patterns: []string{"craft-cms", "craftcms.com", "cpresources/"}},
	{name: "Umbraco", category: "cms", confidence: "high",
		patterns: []string{"umbraco/", "umbracoapi"}},

	// Additional Builders / No-code
	{name: "Framer", category: "builder", confidence: "high",
		patterns: []string{"framerusercontent.com", "framer.com/m/", "framer.website"}},
	{name: "Elementor", category: "builder", confidence: "high",
		patterns: []string{"elementor/assets", "elementor-widget", "elementor-section"}},
	{name: "Divi", category: "builder", confidence: "high",
		patterns: []string{"et-pb-section", "et_pb_", "divi/js/"}},
	{name: "Beaver Builder", category: "builder", confidence: "high",
		patterns: []string{"fl-builder", "fl-module", "bb-plugin/"}},
	{name: "Bricks Builder", category: "builder", confidence: "high",
		patterns: []string{"bricks-data-", "bricksbuilder.io"}},
	{name: "Carrd", category: "builder", confidence: "high",
		patterns: []string{"carrd.co", `generator" content="carrd`}},
	{name: "Jimdo", category: "builder", confidence: "high",
		patterns: []string{"jimdo.com/", "jimdosite.com", "jimdofree.com"}},
	{name: "Strikingly", category: "builder", confidence: "high",
		patterns: []string{"strikingly.com", "s.strikingly.com"}},

	// Additional E-commerce
	{name: "PrestaShop", category: "ecommerce", confidence: "high",
		patterns: []string{"prestashop", "/modules/ps_", "presta-"}},
	{name: "OpenCart", category: "ecommerce", confidence: "high",
		patterns: []string{"catalog/view/theme", "opencart.com", "route=common/home"}},
	{name: "Ecwid", category: "ecommerce", confidence: "high",
		patterns: []string{"app.ecwid.com", "ecwid_script", "ecwid.com/script.js"}},
	{name: "Gumroad", category: "ecommerce", confidence: "high",
		patterns: []string{"gumroad.com/js/", "assets.gumroad.com"}},
	{name: "Snipcart", category: "ecommerce", confidence: "high",
		patterns: []string{"snipcart.nuxtjs.org", "cdn.snipcart.com"}},
	{name: "Paddle", category: "ecommerce", confidence: "high",
		patterns: []string{"paddle.com/js/", "paddle.js", "Paddle.Setup"}},

	// Additional JS Frameworks
	{name: "SvelteKit", category: "framework", confidence: "high",
		patterns: []string{"sveltekit", "_app/immutable/", "@sveltejs/kit"}},
	{name: "SolidJS", category: "framework", confidence: "high",
		patterns: []string{"solid-js", "solid.js", "_solid"}},
	{name: "Qwik", category: "framework", confidence: "high",
		patterns: []string{"qwik.js", "qwikloader", "@builder.io/qwik"}},
	{name: "Ember.js", category: "framework", confidence: "high",
		patterns: []string{"ember.js", "ember-source", "ember-cli"}},
	{name: "Preact", category: "framework", confidence: "medium",
		patterns: []string{"preact.min.js", "preact/src", "preact@"}},
	{name: "Lit", category: "framework", confidence: "high",
		patterns: []string{"lit-element", "lit-html", "@lit/reactive"}},

	// Analytics / Marketing additions
	{name: "LinkedIn Insight Tag", category: "analytics", confidence: "high",
		patterns: []string{"snap.licdn.com/li.lms-analytics", "linkedin.com/px", "linkedin insight"}},
	{name: "TikTok Pixel", category: "analytics", confidence: "high",
		patterns: []string{"analytics.tiktok.com", "tiktok pixel", "ttq.load("}},
	{name: "Pinterest Tag", category: "analytics", confidence: "high",
		patterns: []string{"pintrk(", "ct.pinterest.com", "s.pinimg.com/ct/core.js"}},
	{name: "Twitter / X Pixel", category: "analytics", confidence: "high",
		patterns: []string{"static.ads-twitter.com", "twq('init'", `twq("init"`}},
	{name: "Amplitude", category: "analytics", confidence: "high",
		patterns: []string{"cdn.amplitude.com", "amplitude.getInstance", "amplitude.init"}},
	{name: "PostHog", category: "analytics", confidence: "high",
		patterns: []string{"posthog.com/static", "posthog.init(", "app.posthog.com"}},
	{name: "Plausible", category: "analytics", confidence: "high",
		patterns: []string{"plausible.io/js/", "data-domain"}},
	{name: "Matomo", category: "analytics", confidence: "high",
		patterns: []string{"matomo.js", "piwik.js", "_paq.push"}},
	{name: "Microsoft Clarity", category: "analytics", confidence: "high",
		patterns: []string{"clarity.ms/tag", "microsoft clarity"}},
	{name: "FullStory", category: "analytics", confidence: "high",
		patterns: []string{"fullstory.com/s/fs.js", "FS.identify", "fullstory.com"}},
	{name: "Heap", category: "analytics", confidence: "high",
		patterns: []string{"heapanalytics.com", "cdn.heapanalytics.com", "heap.load"}},
	{name: "Lucky Orange", category: "analytics", confidence: "high",
		patterns: []string{"luckyorange.com/v7/lt.js", "luckyorange.net"}},

	// Customer Support / Chat additions
	{name: "Tidio", category: "analytics", confidence: "high",
		patterns: []string{"code.tidio.co", "tidio.co/track"}},
	{name: "Drift", category: "analytics", confidence: "high",
		patterns: []string{"js.driftt.com", "drift.load(", "api.drift.com"}},
	{name: "LiveChat", category: "analytics", confidence: "high",
		patterns: []string{"livechatinc.com", "cdn.livechatinc.com"}},
	{name: "Freshchat", category: "analytics", confidence: "high",
		patterns: []string{"wchat.freshchat.com", "freshchat.com/js"}},
	{name: "Smartsupp", category: "analytics", confidence: "high",
		patterns: []string{"smartsupp.com/loader.js", "smartsupp.com"}},
	{name: "Olark", category: "analytics", confidence: "high",
		patterns: []string{"static.olark.com", "olark.identify"}},

	// Payment additions
	{name: "PayPal", category: "ecommerce", confidence: "high",
		patterns: []string{"paypal.com/sdk/js", "paypalobjects.com", "paypal.Buttons"}},
	{name: "Square", category: "ecommerce", confidence: "high",
		patterns: []string{"squareup.com/js/", "square.js", "payments.squareup.com"}},
	{name: "Razorpay", category: "ecommerce", confidence: "high",
		patterns: []string{"checkout.razorpay.com", "razorpay.open()"}},

	// Consent / Cookie
	{name: "OneTrust", category: "analytics", confidence: "high",
		patterns: []string{"cdn.cookielaw.org", "onetrust", "optanon"}},
	{name: "Cookiebot", category: "analytics", confidence: "high",
		patterns: []string{"consent.cookiebot.com", "cookiebot.com/"}},
	{name: "CookieYes", category: "analytics", confidence: "high",
		patterns: []string{"cdn-cookieyes.com", "cookieyes.com"}},

	// Form Tools
	{name: "Typeform", category: "analytics", confidence: "high",
		patterns: []string{"typeform.com/to/", "embed.typeform.com"}},
	{name: "JotForm", category: "analytics", confidence: "high",
		patterns: []string{"jotform.com/s/", "jotformpro.com"}},
	{name: "Gravity Forms", category: "analytics", confidence: "high",
		patterns: []string{"gravityforms", "gform_wrapper"}},

	// Monitoring / Error tracking
	{name: "Sentry", category: "analytics", confidence: "high",
		patterns: []string{"browser.sentry-cdn.com", "sentry.io/api/", "Sentry.init"}},
	{name: "LogRocket", category: "analytics", confidence: "high",
		patterns: []string{"cdn.logrocket.io", "logrocket.init("}},

	// Auth
	{name: "Auth0", category: "framework", confidence: "high",
		patterns: []string{"auth0.com/js/", "auth0-js", "cdn.auth0.com"}},
	{name: "Clerk", category: "framework", confidence: "high",
		patterns: []string{"clerk.browser.js", "clerk.dev/npm/@clerk", "accounts.dev"}},
	{name: "Supabase", category: "framework", confidence: "high",
		patterns: []string{"supabase.co/auth", "supabase.js", "@supabase/supabase-js"}},
	{name: "Firebase", category: "framework", confidence: "high",
		patterns: []string{"firebase.googleapis.com", "firebaseapp.com", "__firebase_"}},

	// Maps
	{name: "Google Maps", category: "media", confidence: "high",
		patterns: []string{"maps.googleapis.com", "maps.google.com/maps", "google.com/maps/embed"}},
	{name: "Mapbox", category: "media", confidence: "high",
		patterns: []string{"api.mapbox.com", "mapbox-gl.js"}},

	// Media additions
	{name: "Spotify Embed", category: "media", confidence: "high",
		patterns: []string{"open.spotify.com/embed", "spotify.com/embed"}},
	{name: "SoundCloud Embed", category: "media", confidence: "high",
		patterns: []string{"w.soundcloud.com/player", "soundcloud.com/player"}},
	{name: "Lottie", category: "media", confidence: "high",
		patterns: []string{"lottiefiles.com", "lottie-player", "lottie.js", "bodymovin.js"}},
	{name: "Twitch Embed", category: "media", confidence: "high",
		patterns: []string{"player.twitch.tv", "embed.twitch.tv"}},

	// Additional CDN/Hosting
	{name: "Replit", category: "cdn", confidence: "high",
		patterns: []string{".replit.app", ".repl.co"}},
	{name: "GitHub Pages", category: "cdn", confidence: "medium",
		patterns: []string{".github.io/"}},
	{name: "Render", category: "cdn", confidence: "medium",
		patterns: []string{".onrender.com"}},
	{name: "Cloudflare Pages", category: "cdn", confidence: "high",
		patterns: []string{"pages.cloudflare.com", "pages.dev"}},
	{name: "Supabase Storage", category: "cdn", confidence: "high",
		patterns: []string{"supabase.co/storage/"}},
	{name: "AWS S3", category: "cdn", confidence: "medium",
		patterns: []string{"s3.amazonaws.com", "s3-website"}},

	// Email Marketing
	{name: "Mailchimp", category: "analytics", confidence: "high",
		patterns: []string{"chimpstatic.com", "mailchimp.com/", "list-manage.com"}},
	{name: "ConvertKit", category: "analytics", confidence: "high",
		patterns: []string{"convertkit.com/", "convertkit-form"}},
	{name: "ActiveCampaign", category: "analytics", confidence: "high",
		patterns: []string{"activehosted.com", "activecampaign.com/acton"}},
	{name: "Brevo", category: "analytics", confidence: "high",
		patterns: []string{"sibautomation.com", "sendinblue.com", "brevo.com"}},
	{name: "Mailerlite", category: "analytics", confidence: "high",
		patterns: []string{"assets.mailerlite.com", "mailerlite.com/js"}},
}

type aiBuilderPattern struct {
	name     string
	patterns []string
}

var aiBuilderPatterns = []aiBuilderPattern{
	{name: "Framer", patterns: []string{"framerusercontent.com", "framer.com/m/", "framer.website", `"generator" content="framer`}},
	{name: "Replit", patterns: []string{".replit.app", ".repl.co", "replit.com/@", `generator" content="replit`}},
	{name: "Durable", patterns: []string{"durable.co", "durable.site", `generator" content="durable`}},
	{name: "10Web", patterns: []string{"10web.io", `generator" content="10web`}},
	{name: "Hostinger Website Builder", patterns: []string{"hostingersite.com", "zyrosite.com", `generator" content="zyro`}},
	{name: "Jimdo", patterns: []string{"jimdo.com/", "jimdosite.com", "jimdofree.com"}},
	{name: "B12", patterns: []string{"b12.io", "b12sites.com"}},
	{name: "Dorik", patterns: []string{"dorik.com", "dorik.io"}},
	{name: "Typedream", patterns: []string{"typedream.app", "typedream.com/fonts"}},
	{name: "GoDaddy Website Builder", patterns: []string{"godaddysites.com"}},
	{name: "Unbounce", patterns: []string{"unbouncepages.com", "unbounce.com/js/"}},
	{name: "Leadpages", patterns: []string{"leadpages.co", "leadpages.net/"}},
	{name: "Carrd", patterns: []string{"carrd.co", `generator" content="carrd`}},
	{name: "Strikingly", patterns: []string{"strikingly.com", "s.strikingly.com"}},
	{name: "Ucraft", patterns: []string{"ucraft.com", "ucraft.net"}},
	{name: "Hocoos", patterns: []string{"hocoos.com"}},
	{name: "Bolt (StackBlitz)", patterns: []string{"bolt.new", "stackblitz.io", "webcontainer.io"}},
	{name: "v0 (Vercel)", patterns: []string{"v0.dev/chat", `generator" content="v0`}},
	{name: "Lovable", patterns: []string{"lovable.app", "lovable.dev", `generator" content="lovable`}},
	{name: "Cursor", patterns: []string{`generator" content="cursor`}},
	{name: "Windsurf", patterns: []string{`generator" content="windsurf`}},
}

// genericAISignals are patterns that suggest AI-generated/assisted content without identifying a specific builder.
var genericAISignals = []string{
	`generator" content="ai`,
	"ai-generated",
	"generated by ai",
	"created with ai",
	"powered by ai",
}

// DetectAIBuilder checks whether the site was built with a known AI website builder.
func DetectAIBuilder(rawHTML string) model.AIDetection {
	lower := strings.ToLower(rawHTML)
	var signals []string

	// Check specific AI builders
	for _, b := range aiBuilderPatterns {
		for _, pat := range b.patterns {
			if strings.Contains(lower, strings.ToLower(pat)) {
				return model.AIDetection{
					IsAIBuilt:  true,
					Confidence: "high",
					Builder:    b.name,
					Signals:    []string{pat},
				}
			}
		}
	}

	// Check generic signals
	for _, sig := range genericAISignals {
		if strings.Contains(lower, sig) {
			signals = append(signals, sig)
		}
	}
	if len(signals) > 0 {
		return model.AIDetection{
			IsAIBuilt:  true,
			Confidence: "medium",
			Builder:    "",
			Signals:    signals,
		}
	}

	return model.AIDetection{IsAIBuilt: false}
}

type scoredTech struct {
	item    model.TechItem
	score   int // 0-100 internal score used to map confidence labels
	signals []matchedSignal
}

type matchedSignal struct {
	pattern      string
	match        string
	evidenceType string // explicit, indirect, weak
	strength     int
	source       string // first-party, third-party, unknown
}

var urlTokenRe = regexp.MustCompile(`https?://[^\s"'<>]+`)

// detectTech performs substring matching and maps an internal 0-100 score to
// a confidence label (high/medium/low) for each detected technology.
func detectTech(rawHTML string, sourceURL string) []model.TechItem {
	lower := strings.ToLower(rawHTML)
	tagSource := onlyTags(lower)
	sourceRoot := sourceSiteRoot(sourceURL)

	byName := make(map[string]scoredTech)
	order := make([]string, 0, len(techPatterns))

	for i, p := range techPatterns {
		matchSource := lower
		if p.tagOnly {
			matchSource = tagSource
		}

		signals := matchPatternSignals(matchSource, p, sourceRoot)
		if len(signals) == 0 {
			continue
		}

		score := computeTechScore(p, signals)
		candidate := scoredTech{
			item: model.TechItem{
				Name:       p.name,
				Category:   p.category,
				Confidence: confidenceFromScore(score),
				RuleID:     techRuleID(i, p),
				Score:      score,
				Signals:    toModelSignals(signals),
			},
			score:   score,
			signals: signals,
		}

		prev, exists := byName[p.name]
		if !exists {
			byName[p.name] = candidate
			order = append(order, p.name)
			continue
		}
		if candidate.score > prev.score {
			byName[p.name] = candidate
		}
	}

	found := make([]model.TechItem, 0, len(byName))
	for _, name := range order {
		found = append(found, byName[name].item)
	}
	return found
}

func matchPatternSignals(source string, p techPattern, sourceRoot string) []matchedSignal {
	if len(p.patterns) == 0 {
		return nil
	}

	if p.requireAll {
		signals := make([]matchedSignal, 0, len(p.patterns))
		for _, pat := range p.patterns {
			sig, ok := bestPatternSignal(source, pat, sourceRoot)
			if !ok {
				return nil
			}
			signals = append(signals, sig)
		}
		return signals
	}

	signals := make([]matchedSignal, 0, len(p.patterns))
	for _, pat := range p.patterns {
		sig, ok := bestPatternSignal(source, pat, sourceRoot)
		if ok {
			signals = append(signals, sig)
		}
	}
	return signals
}

func bestPatternSignal(source string, pattern string, sourceRoot string) (matchedSignal, bool) {
	lowerPattern := strings.ToLower(pattern)
	idx := strings.Index(source, lowerPattern)
	if idx < 0 {
		return matchedSignal{}, false
	}

	strength := signalStrength(lowerPattern)
	sample := snippetAround(source, idx, len(lowerPattern), 120)
	best := matchedSignal{
		pattern:      pattern,
		match:        sample,
		evidenceType: evidenceTypeFromStrength(strength),
		strength:     strength,
		source:       classifySignalSource(sample, lowerPattern, sourceRoot),
	}

	// Scan a few additional occurrences to prefer first-party evidence when available.
	offset := idx + len(lowerPattern)
	for scans := 0; scans < 4; scans++ {
		next := strings.Index(source[offset:], lowerPattern)
		if next < 0 {
			break
		}
		abs := offset + next
		candidateSample := snippetAround(source, abs, len(lowerPattern), 120)
		candidate := matchedSignal{
			pattern:      pattern,
			match:        candidateSample,
			evidenceType: evidenceTypeFromStrength(strength),
			strength:     strength,
			source:       classifySignalSource(candidateSample, lowerPattern, sourceRoot),
		}
		if signalSourceRank(candidate.source) > signalSourceRank(best.source) {
			best = candidate
		}
		offset = abs + len(lowerPattern)
	}

	return best, true
}

func computeTechScore(p techPattern, signals []matchedSignal) int {
	if len(signals) == 0 || len(p.patterns) == 0 {
		return 0
	}

	matchedCount := len(signals)
	maxStrength := signals[0].strength
	sum := 0
	strongCount := 0
	firstPartyCount := 0
	thirdPartyCount := 0
	for _, s := range signals {
		sum += s.strength
		if s.strength > maxStrength {
			maxStrength = s.strength
		}
		if s.evidenceType == "explicit" {
			strongCount++
		}
		if s.source == "first-party" {
			firstPartyCount++
		}
		if s.source == "third-party" {
			thirdPartyCount++
		}
	}
	avgStrength := sum / len(signals)
	coverage := float64(matchedCount) / float64(len(p.patterns))

	// Evidence score:
	// - strongest matched signal drives most of the score
	// - average matched strength smooths noisy single matches
	// - coverage rewards matching a larger share of fingerprints
	core := (0.7*float64(maxStrength) + 0.3*float64(avgStrength))
	score := int(core*0.75 + coverage*25.0)

	if p.requireAll && len(p.patterns) > 1 {
		score += 4
	}
	if matchedCount > 1 {
		score += 3
	}
	score += confidenceBias(p.confidence)

	// First-party vs third-party weighting for CMS/framework detections.
	if p.category == "cms" || p.category == "framework" {
		if firstPartyCount > 0 {
			score += 8
		}
		if thirdPartyCount == matchedCount {
			score -= 18
		}
	}

	// High confidence for CMS/framework requires explicit fingerprints.
	if (p.category == "cms" || p.category == "framework") && strongCount == 0 && score > 69 {
		score = 69
	}

	// Single third-party CMS hit is highly ambiguous.
	if p.category == "cms" && matchedCount == 1 && thirdPartyCount == 1 && score > 39 {
		score = 39
	}

	// Vite broad bundle heuristic should remain low confidence.
	if p.name == "Vite" && p.requireAll && score > 39 {
		score = 39
	}

	return clampScore(score)
}

func confidenceFromScore(score int) string {
	switch {
	case score >= 70:
		return "high"
	case score >= 40:
		return "medium"
	default:
		return "low"
	}
}

func confidenceBias(conf string) int {
	switch conf {
	case "high":
		return 3
	case "low":
		return -3
	default:
		return 0
	}
}

func signalStrength(pattern string) int {
	p := strings.ToLower(strings.TrimSpace(pattern))
	switch {
	case isExplicitSignal(p):
		return 92
	case isStrongIndirectSignal(p):
		return 55
	default:
		return 24
	}
}

func evidenceTypeFromStrength(strength int) string {
	switch {
	case strength >= 90:
		return "explicit"
	case strength >= 50:
		return "indirect"
	default:
		return "weak"
	}
}

func isExplicitSignal(p string) bool {
	if p == "" {
		return false
	}

	if strings.Contains(p, "generator") ||
		strings.HasPrefix(p, "window.") ||
		strings.HasPrefix(p, "__") ||
		strings.Contains(p, "@vite/client") ||
		strings.Contains(p, ".init") {
		return true
	}

	if strings.Contains(p, ".js") && strings.Contains(p, "/") {
		return true
	}

	// Unique vendor asset domains are explicit fingerprints.
	for _, suffix := range []string{".com/", ".net/", ".io/", ".app/", ".dev/", ".co/", ".org/"} {
		if strings.Contains(p, suffix) {
			return true
		}
	}

	return false
}

func isStrongIndirectSignal(p string) bool {
	for _, hint := range []string{
		"data-",
		"modulepreload",
		"__vite__mapdeps",
		"vite:preloaderror",
		"wp-json/wp/",
		"/_next/",
		"/_nuxt/",
		"chunk",
		"bundle",
		"webpack",
		"ng-version",
		"/static/js/",
		"/wp-content/",
		"/wp-includes/",
		"astro-",
	} {
		if strings.Contains(p, hint) {
			return true
		}
	}
	return false
}

func clampScore(score int) int {
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

func toModelSignals(signals []matchedSignal) []model.TechSignal {
	out := make([]model.TechSignal, 0, len(signals))
	for _, s := range signals {
		out = append(out, model.TechSignal{
			Pattern:      s.pattern,
			Match:        s.match,
			EvidenceType: s.evidenceType,
			Source:       s.source,
		})
	}
	return out
}

func techRuleID(index int, p techPattern) string {
	name := strings.ToLower(strings.ReplaceAll(p.name, " ", "-"))
	name = strings.ReplaceAll(name, ".", "")
	name = strings.ReplaceAll(name, "/", "-")
	return fmt.Sprintf("%s-%s-%03d", name, p.category, index+1)
}

func sourceSiteRoot(sourceURL string) string {
	u, err := url.Parse(sourceURL)
	if err != nil {
		return ""
	}
	return hostRoot(u.Hostname())
}

func hostRoot(host string) string {
	if host == "" {
		return ""
	}
	root, err := publicsuffix.EffectiveTLDPlusOne(host)
	if err != nil || root == "" {
		return host
	}
	return root
}

func classifySignalSource(sample string, lowerPattern string, sourceRoot string) string {
	if sourceRoot == "" {
		return "unknown"
	}

	urls := urlTokenRe.FindAllString(sample, -1)
	for _, token := range urls {
		clean := strings.TrimRight(token, ".,;)]}\"'")
		u, err := url.Parse(clean)
		if err != nil || u.Hostname() == "" {
			continue
		}
		if strings.Contains(clean, lowerPattern) {
			if hostRoot(u.Hostname()) == sourceRoot {
				return "first-party"
			}
			return "third-party"
		}
	}

	// Relative paths generally refer to the same site.
	if strings.HasPrefix(lowerPattern, "/") {
		return "first-party"
	}
	return "unknown"
}

func signalSourceRank(source string) int {
	switch source {
	case "first-party":
		return 3
	case "unknown":
		return 2
	default:
		return 1
	}
}

func snippetAround(s string, idx int, patternLen int, span int) string {
	if idx < 0 {
		return ""
	}
	start := idx - span/2
	if start < 0 {
		start = 0
	}
	end := idx + patternLen + span/2
	if end > len(s) {
		end = len(s)
	}
	snippet := strings.TrimSpace(s[start:end])
	if len(snippet) > span {
		snippet = snippet[:span]
	}
	return snippet
}

// onlyTags returns just the HTML tag content (without text nodes) to support
// tag-only matching for ambiguous patterns.
func onlyTags(lowerHTML string) string {
	var b strings.Builder
	b.Grow(len(lowerHTML))

	inTag := false
	for _, r := range lowerHTML {
		switch r {
		case '<':
			inTag = true
			b.WriteRune(' ')
		case '>':
			inTag = false
			b.WriteRune(' ')
		default:
			if inTag {
				b.WriteRune(r)
			}
		}
	}
	return b.String()
}
