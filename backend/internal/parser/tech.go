package parser

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"sort"
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
	// All Vue signals are specific enough to warrant high confidence.
	{name: "Vue", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"vue.min.js", "vue@"}},
	{name: "Vue", category: "framework", confidence: "high",
		patterns: []string{"vue.runtime", "__vue__"}},
	// Angular — ng-version is injected by Angular into the root element, highly specific.
	{name: "Angular", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"angular.min.js"}},
	{name: "Angular", category: "framework", confidence: "high",
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
		// analytics.identify( and analytics.track( removed — too generic, any custom
		// analytics wrapper can use these method names.
		patterns: []string{"cdn.segment.com", "segment.io/analytics"}},
	{name: "Mixpanel", category: "analytics", confidence: "high",
		patterns: []string{"cdn.mxpnl.com", "mixpanel.com/libs", "mixpanel.init"}},
	{name: "Klaviyo", category: "analytics", confidence: "high",
		patterns: []string{"static.klaviyo.com", "klaviyo.com/media"}},
	{name: "Salesforce", category: "analytics", confidence: "high",
		patterns: []string{"pardot.com", "sfdcstatic.com", "force.com/resource"}},
	{name: "Zendesk", category: "analytics", confidence: "high",
		patterns: []string{"zdassets.com", "zendeskcdn.com", "static.zdassets.com"}},
	{name: "Stripe", category: "ecommerce", confidence: "high",
		// stripe.network removed — too generic; js.stripe.com and stripe-js are definitive.
		patterns: []string{"js.stripe.com", "stripe-js"}},
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
	// Bootstrap and jQuery file names are restricted to tag attributes (tagOnly) to
	// avoid body-text false positives from tutorials/docs. When found in actual tags
	// (src=, href=) they are definitive — high confidence is appropriate.
	{name: "Bootstrap", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"bootstrap.min.css", "bootstrap.min.js", "bootstrap@"}},
	{name: "jQuery", category: "framework", confidence: "high",
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
		// requireAll: both must match — data-domain alone is a generic HTML attribute
		// that appears on many elements unrelated to Plausible.
		patterns: []string{"plausible.io/js/", "data-domain"}, requireAll: true},
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

	// Backend Frameworks
	{name: "Django", category: "framework", confidence: "high",
		patterns: []string{"csrfmiddlewaretoken", "django.contrib", "__django_debug"}},
	{name: "Ruby on Rails", category: "framework", confidence: "high",
		patterns: []string{"rails-ujs", "data-turbo-frame", "action_cable", "ActionCable.createConsumer"}},
	{name: "Inertia.js", category: "framework", confidence: "high",
		patterns: []string{"__inertia", "inertiajs.com", "@inertiajs/"}},

	// JS Libraries
	{name: "Three.js", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"three.min.js", "three.module.js", "three@", "unpkg.com/three"}},
	{name: "D3.js", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"d3.min.js", "d3.v3.", "d3.v4.", "d3.v5.", "d3.v6.", "d3.v7.", "cdn.jsdelivr.net/npm/d3"}},
	{name: "Chart.js", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"chart.min.js", "chart.umd.js", "chart@", "cdn.jsdelivr.net/npm/chart.js"}},
	{name: "Swiper", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"swiper-bundle.min", "swiper.min.js", "swiper@"}},
	{name: "GSAP", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"gsap.min.js", "cdn.gsap.com", "greensock.com/js", "TweenMax.min.js", "TweenLite.min.js"}},
	{name: "Leaflet", category: "media", confidence: "high",
		tagOnly: true,
		patterns: []string{"leaflet.js", "leaflet@", "leaflet-src.js", "unpkg.com/leaflet"}},

	// Video Platforms
	{name: "Wistia", category: "media", confidence: "high",
		patterns: []string{"fast.wistia.com", "wistia.net/", "wistia_async"}},
	{name: "JW Player", category: "media", confidence: "high",
		patterns: []string{"jwpcdn.com", "jwplatform.com", "jwplayer.js", "jwplayer("}},
	{name: "Vidyard", category: "media", confidence: "high",
		patterns: []string{"play.vidyard.com", "vidyard.com/players", "embed.vidyard.com"}},
	{name: "Brightcove", category: "media", confidence: "high",
		patterns: []string{"players.brightcove.net", "brightcove.net/", "brightcove-player"}},
	{name: "Dailymotion Embed", category: "media", confidence: "high",
		patterns: []string{"dailymotion.com/embed", "geo.dailymotion.com"}},

	// Additional CDN / Hosting
	{name: "BunnyCDN", category: "cdn", confidence: "high",
		patterns: []string{"b-cdn.net", "bunnycdn.com", "iframe.mediadelivery.net"}},
	{name: "KeyCDN", category: "cdn", confidence: "high",
		patterns: []string{"kxcdn.com"}},

	// Analytics / Optimisation
	{name: "Pendo", category: "analytics", confidence: "high",
		patterns: []string{"cdn.pendo.io", "pendo.io/agent", "pendo.initialize"}},
	{name: "VWO", category: "analytics", confidence: "high",
		patterns: []string{"dev.visualwebsiteoptimizer.com", "app.vwo.com", "vwoCode.init"}},
	{name: "Optimizely", category: "analytics", confidence: "high",
		patterns: []string{"cdn.optimizely.com", "optimizely.com/js/", "window.optimizely"}},
	{name: "New Relic", category: "analytics", confidence: "high",
		patterns: []string{"js-agent.newrelic.com", "bam.nr-data.net", "newrelic.com/agent"}},
	{name: "Datadog RUM", category: "analytics", confidence: "high",
		patterns: []string{"browser-intake-datadoghq.com", "datadoghq-browser-agent.com", "DD_RUM.init"}},
	{name: "Braze", category: "analytics", confidence: "high",
		patterns: []string{"js.appboycdn.com", "braze.com/web-sdk", "appboy.initialize"}},
	{name: "Customer.io", category: "analytics", confidence: "high",
		patterns: []string{"assets.customer.io", "track.customer.io", "_cio.identify"}},

	// Consent / Privacy additions
	{name: "TrustArc", category: "analytics", confidence: "high",
		patterns: []string{"consent.trustarc.com", "choices.trustarc.com", "trustarc.com/notice"}},
	{name: "Didomi", category: "analytics", confidence: "high",
		patterns: []string{"sdk.privacy-center.org", "didomi.io", "window.didomiOnReady"}},

	// Buy-now-pay-later / Payments
	{name: "Klarna", category: "ecommerce", confidence: "high",
		patterns: []string{"x.klarnacdn.net", "klarna.com/js/", "Klarna.init"}},
	{name: "Affirm", category: "ecommerce", confidence: "high",
		patterns: []string{"cdn1.affirm.com", "affirm.com/js/", "affirm.ui.ready"}},
	{name: "Afterpay", category: "ecommerce", confidence: "high",
		patterns: []string{"js.afterpay.com", "portal.afterpay.com", "afterpay.initialize"}},

	// Reviews / Social proof
	{name: "Trustpilot", category: "analytics", confidence: "high",
		patterns: []string{"widget.trustpilot.com", "tp.widget.bootstrap", "trustpilot-widget"}},
	{name: "Yotpo", category: "analytics", confidence: "high",
		patterns: []string{"staticw2.yotpo.com", "yotpo.com/js/", "yotpoWidgetsContainer"}},

	// Push Notifications
	{name: "OneSignal", category: "analytics", confidence: "high",
		patterns: []string{"cdn.onesignal.com", "onesignal.com/sdks", "OneSignal.init"}},

	// Search
	{name: "Algolia", category: "analytics", confidence: "high",
		patterns: []string{"algolianet.com", "algolia.net/", "instantsearch.js", "algoliasearch"}},

	// Customer Support additions
	{name: "Help Scout", category: "analytics", confidence: "high",
		patterns: []string{"beacon-v2.helpscout.net", "helpscout.net/beacon", "Beacon('init'"}},

	// More CMS
	{name: "Kirby", category: "cms", confidence: "high",
		patterns: []string{`generator" content="kirby`, "getkirby.com", "kirby/panel"}},
	{name: "Statamic", category: "cms", confidence: "high",
		patterns: []string{`generator" content="statamic`, "statamic.com", "statamic-api"}},
	{name: "Directus", category: "cms", confidence: "high",
		patterns: []string{"directus.io", "_directus_", "directus/assets"}},
	{name: "Payload CMS", category: "cms", confidence: "high",
		patterns: []string{"payload-cms", "@payloadcms/", "payload.richText"}},
	{name: "Tilda", category: "cms", confidence: "high",
		patterns: []string{"tildacdn.com", "tilda.ws", "t-records"}},

	// More Builders / No-code
	{name: "Bubble.io", category: "builder", confidence: "high",
		patterns: []string{"bubble.io/shared_components", "cdn.bubble.io", "bubble-element"}},
	{name: "Softr", category: "builder", confidence: "high",
		patterns: []string{"softr.app", "softr.io/js", "softr-studio"}},
	{name: "Readymag", category: "builder", confidence: "high",
		patterns: []string{"readymag.com"}},

	// Hotwire / Turbo
	{name: "Turbo", category: "framework", confidence: "high",
		patterns: []string{"turbo-frame", "turbo-stream", "@hotwired/turbo", "turbo.es2017-umd"}},

	// More JS Libraries
	{name: "Anime.js", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"animejs", "anime.min.js", "anime@"}},
	{name: "Video.js", category: "media", confidence: "high",
		patterns: []string{"vjs-tech", "video-js", "video.min.js", "videojs.com"}},
	{name: "Mux", category: "media", confidence: "high",
		patterns: []string{"cdn.mux.com", "mux-player", "stream.mux.com"}},
	{name: "Plyr", category: "media", confidence: "high",
		tagOnly: true,
		patterns: []string{"plyr.js", "plyr.css", "cdn.plyr.io"}},
	{name: "AOS", category: "framework", confidence: "high",
		patterns: []string{"aos.js", "aos.css", "data-aos="}},
	{name: "PhotoSwipe", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"photoswipe.css", "photoswipe.js", "photoswipe@"}},
	{name: "Prism.js", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"prism.min.js", "prism.css", "prismjs.com"}},

	// Image / Media CDN
	{name: "Cloudinary", category: "media", confidence: "high",
		patterns: []string{"res.cloudinary.com", "cloudinary.com/image/upload"}},
	{name: "Imgix", category: "media", confidence: "high",
		patterns: []string{"imgix.net"}},

	// More E-commerce / Payments
	{name: "Lemon Squeezy", category: "ecommerce", confidence: "high",
		patterns: []string{"lemonsqueezy.com/js", "lmsqueezy.com", "LemonSqueezy.Setup"}},
	{name: "Recharge", category: "ecommerce", confidence: "high",
		patterns: []string{"rechargepayments.com", "rechargeapps.com", "recharge.js"}},
	{name: "Adyen", category: "ecommerce", confidence: "high",
		patterns: []string{"checkoutshopper-live.adyen.com", "adyen.com/v1/", "AdyenCheckout"}},
	{name: "Braintree", category: "ecommerce", confidence: "high",
		patterns: []string{"js.braintreegateway.com", "braintree-web", "braintree.client.create"}},
	{name: "Mollie", category: "ecommerce", confidence: "high",
		patterns: []string{"js.mollie.com", "mollie.com/v2/", "mollie.createToken"}},
	{name: "Recurly", category: "ecommerce", confidence: "high",
		patterns: []string{"js.recurly.com", "recurly.configure", "recurlyjs.com"}},

	// More Analytics
	{name: "Crazy Egg", category: "analytics", confidence: "high",
		patterns: []string{"script.crazyegg.com", "cetrk.com", "crazyegg.com/pages/scripts"}},
	{name: "Mouseflow", category: "analytics", confidence: "high",
		patterns: []string{"mouseflow.com", "cdn.mouseflow.com", "mf.init("}},
	{name: "Contentsquare", category: "analytics", confidence: "high",
		patterns: []string{"contentsquare.net", "tag.contentsquare.net", "uxa.io"}},
	{name: "AB Tasty", category: "analytics", confidence: "high",
		patterns: []string{"abtasty.com", "cdn.abtasty.com"}},
	{name: "Woopra", category: "analytics", confidence: "high",
		patterns: []string{"static.woopra.com", "woopra.track(", "woopra.com/track"}},
	{name: "Koala", category: "analytics", confidence: "high",
		patterns: []string{"cdn.getkoala.com", "getkoala.com/v1/pk"}},
	{name: "ZoomInfo", category: "analytics", confidence: "high",
		patterns: []string{"ws.zoominfo.com", "zoominfo.com/js/", "zi.track"}},
	{name: "Clearbit", category: "analytics", confidence: "high",
		patterns: []string{"x.clearbitjs.com", "tag.clearbit.com", "clearbit.identify"}},
	{name: "Survicate", category: "analytics", confidence: "high",
		patterns: []string{"survicate.com/survey", "survey.survicate.com", "Survicate.initialize"}},

	// More Support / Chat
	{name: "Gorgias", category: "analytics", confidence: "high",
		patterns: []string{"config.gorgias.chat", "gorgias.com/loader", "GorgiasChat.init"}},
	{name: "Chaport", category: "analytics", confidence: "high",
		patterns: []string{"app.chaport.com/widget", "chaport.com/js/widget"}},
	{name: "Freshdesk Widget", category: "analytics", confidence: "high",
		patterns: []string{"euc-widget.freshworks.com", "widget.freshdesk.com", "FreshworksWidget("}},

	// More Email Marketing
	{name: "Omnisend", category: "analytics", confidence: "high",
		patterns: []string{"omnisend.com/sdk", "omnisnippet1.com"}},
	{name: "Drip", category: "analytics", confidence: "high",
		patterns: []string{"js.getdrip.com", "getdrip.com/", "dc.getdrip.com"}},
	{name: "Campaign Monitor", category: "analytics", confidence: "high",
		patterns: []string{"createsend.com", "campaign-archive.com", "cmail1.com"}},
	{name: "Beehiiv", category: "analytics", confidence: "high",
		patterns: []string{"beehiiv.com", "embeds.beehiiv.com"}},

	// More Consent / Privacy
	{name: "Osano", category: "analytics", confidence: "high",
		patterns: []string{"cmp.osano.com", "osano.com/consent"}},
	{name: "Termly", category: "analytics", confidence: "high",
		patterns: []string{"app.termly.io", "termly.io/resource-blocker"}},
	{name: "Usercentrics", category: "analytics", confidence: "high",
		patterns: []string{"app.usercentrics.eu", "usercentrics.eu/browser-ui"}},
	{name: "Axeptio", category: "analytics", confidence: "high",
		patterns: []string{"cookies.axeptio.eu", "axeptio.eu/js/"}},
	{name: "Borlabs Cookie", category: "analytics", confidence: "high",
		patterns: []string{"borlabs-cookie", "borlabs-cookie.js"}},

	// Reviews / Ratings
	{name: "Reviews.io", category: "analytics", confidence: "high",
		patterns: []string{"widget.reviews.io", "reviews.io/widget"}},
	{name: "Judge.me", category: "analytics", confidence: "high",
		patterns: []string{"judge.me/reviews", "judgeme_widget", "cdn.judge.me"}},
	{name: "Okendo", category: "analytics", confidence: "high",
		patterns: []string{"marketing.okendo.com", "api.okendo.com", "okendo-reviews"}},
	{name: "Stamped.io", category: "analytics", confidence: "high",
		patterns: []string{"cdn.stamped.io", "stamped.io/api/widget"}},

	// Accessibility
	{name: "UserWay", category: "analytics", confidence: "high",
		patterns: []string{"cdn.userway.org", "userway.org/widget"}},
	{name: "accessiBe", category: "analytics", confidence: "high",
		patterns: []string{"acsbapp.com", "accessibe.com", "acsbJS.init"}},
	{name: "AudioEye", category: "analytics", confidence: "high",
		patterns: []string{"audioeye.com", "cdn.audioeye.com"}},

	// More Auth / Identity
	{name: "Okta", category: "framework", confidence: "high",
		patterns: []string{"oktacdn.com", "okta.com/oauth2", "OktaSignIn("}},
	{name: "WorkOS", category: "framework", confidence: "high",
		patterns: []string{"workos.com/", "api.workos.com"}},

	// More Error Tracking / Monitoring
	{name: "Dynatrace", category: "analytics", confidence: "high",
		patterns: []string{"dtrum.js", "dynatrace.com/api", "dtrum.init"}},
	{name: "Rollbar", category: "analytics", confidence: "high",
		patterns: []string{"cdn.rollbar.com", "rollbar.js", "Rollbar.init"}},
	{name: "Bugsnag", category: "analytics", confidence: "high",
		patterns: []string{"bugsnag.com/js/", "app.bugsnag.com", "Bugsnag.start"}},

	// AI Chatbots / Automation
	{name: "ManyChat", category: "analytics", confidence: "high",
		patterns: []string{"widget.manychat.com", "manychat.com/widget"}},
	{name: "Landbot", category: "analytics", confidence: "high",
		patterns: []string{"landbot.io/universal/", "static.landbot.io"}},
	{name: "Voiceflow", category: "analytics", confidence: "high",
		patterns: []string{"cdn.voiceflow.com", "voiceflow.com/api/interact"}},

	// More Maps
	{name: "HERE Maps", category: "media", confidence: "high",
		patterns: []string{"js.api.here.com", "here.com/js/mapsjs"}},
	{name: "OpenLayers", category: "media", confidence: "high",
		tagOnly: true,
		patterns: []string{"openlayers.org", "cdn.jsdelivr.net/npm/ol@", "ol.js"}},

	// Push Notifications
	{name: "PushOwl", category: "analytics", confidence: "high",
		patterns: []string{"cdn.pushowl.com", "pushowl.com/service-worker"}},

	// More CMS / Enterprise
	{name: "Adobe Experience Manager", category: "cms", confidence: "high",
		patterns: []string{"/etc.clientlibs/", "/content/dam/", "aem.js", "cq:page"}},
	{name: "Sitecore", category: "cms", confidence: "high",
		patterns: []string{"/sitecore/shell/", "sitecore-jss", "Sitecore.JavaScriptServices"}},
	{name: "Kontent.ai", category: "cms", confidence: "high",
		patterns: []string{"deliver.kontent.ai", "preview-deliver.kontent.ai"}},
	{name: "Webiny", category: "cms", confidence: "high",
		patterns: []string{"webiny.com", "webiny-cms", "webiny-serverless"}},

	// More WordPress Page Builders
	{name: "WPBakery", category: "builder", confidence: "high",
		patterns: []string{"vc_row", "wpb_wrapper", "vc_column", "js_composer"}},
	{name: "Oxygen Builder", category: "builder", confidence: "high",
		patterns: []string{"ct-section", "oxygen-vsb", "ct-div-block"}},
	{name: "Avada", category: "builder", confidence: "high",
		tagOnly: true,
		patterns: []string{"avada-", "fusion-core", "avadabuilder", "fusion-builder"}},
	{name: "Kadence Blocks", category: "builder", confidence: "high",
		patterns: []string{"kadence-blocks", "kadence-theme", "wp-block-kadence-"}},
	{name: "GeneratePress", category: "builder", confidence: "high",
		patterns: []string{"generatepress", "gp-style.css", "generate-style.min.css"}},
	{name: "Astra", category: "builder", confidence: "high",
		patterns: []string{"astra-theme", "astra-child", "astra.css"}},
	{name: "Brizy", category: "builder", confidence: "high",
		tagOnly: true,
		patterns: []string{"brizy-", "brizy.cloud", "brizy-rich-text"}},

	// More JS Charts / Visualization
	{name: "ApexCharts", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"apexcharts.min.js", "apexcharts.com", "apexcharts@"}},
	{name: "ECharts", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"echarts.min.js", "echarts.apache.org", "echarts@"}},
	{name: "Highcharts", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"highcharts.js", "code.highcharts.com", "highcharts@"}},
	{name: "Plotly", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"plotly.min.js", "plotly-latest.min.js", "cdn.plot.ly"}},

	// More JS UI / Utility Libraries
	{name: "Socket.io", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"socket.io.js", "socket.io.min.js", "cdn.socket.io"}},
	{name: "Pusher", category: "framework", confidence: "high",
		patterns: []string{"js.pusher.com", "pusher.subscribe(", "pusher-js"}},
	{name: "Ably", category: "framework", confidence: "high",
		patterns: []string{"cdn.ably.io", "ably.com/lib/", "ably.realtime.connect"}},
	{name: "Redux", category: "framework", confidence: "high",
		patterns: []string{"__REDUX_DEVTOOLS_EXTENSION__", "redux.min.js", "redux-devtools"}},
	{name: "Tippy.js", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"tippy.js", "unpkg.com/tippy.js", "tippy@"}},
	{name: "FullPage.js", category: "framework", confidence: "high",
		patterns: []string{"fullpage.js", "alvarotrigo.com/fullPage", "fullpage_wrapper"}},
	{name: "Select2", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"select2.min.js", "select2.css", "select2@"}},
	{name: "Flatpickr", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"flatpickr.min.js", "flatpickr.css", "flatpickr@"}},
	{name: "Moment.js", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"moment.min.js", "moment@", "cdn.jsdelivr.net/npm/moment"}},
	{name: "Highlight.js", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"highlight.min.js", "cdnjs.cloudflare.com/ajax/libs/highlight.js", "hljs.highlightAll"}},
	{name: "MathJax", category: "framework", confidence: "high",
		patterns: []string{"cdn.mathjax.org", "cdnjs.cloudflare.com/ajax/libs/mathjax", "MathJax.Hub.Config"}},
	{name: "KaTeX", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"katex.min.js", "katex.min.css", "cdn.jsdelivr.net/npm/katex"}},

	// Rich Text / Code Editors
	{name: "CKEditor", category: "framework", confidence: "high",
		patterns: []string{"ckeditor.com", "cke_editable", "CKEDITOR.replace", "cdn.ckeditor.com"}},
	{name: "Quill", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"quill.min.js", "cdn.quilljs.com", "quill.snow.css"}},
	{name: "Monaco Editor", category: "framework", confidence: "high",
		patterns: []string{"monaco-editor", "vs/loader.js", "vs/editor/editor.main"}},

	// More Hosting / PaaS
	{name: "Fly.io", category: "cdn", confidence: "medium",
		patterns: []string{".fly.dev"}},
	{name: "Railway", category: "cdn", confidence: "medium",
		patterns: []string{".railway.app", ".up.railway.app"}},
	{name: "Heroku", category: "cdn", confidence: "medium",
		patterns: []string{".herokuapp.com"}},
	{name: "DigitalOcean Apps", category: "cdn", confidence: "medium",
		patterns: []string{".ondigitalocean.app"}},

	// More E-commerce / Payments
	{name: "Paystack", category: "ecommerce", confidence: "high",
		patterns: []string{"js.paystack.co", "paystack.com/js/", "PaystackPop.setup"}},
	{name: "Flutterwave", category: "ecommerce", confidence: "high",
		patterns: []string{"api.flutterwave.com", "checkout.flutterwave.com", "FlutterwaveCheckout"}},
	{name: "Authorize.net", category: "ecommerce", confidence: "high",
		patterns: []string{"accept.authorize.net", "acceptjs.js", "AuthorizeNetIFrame"}},
	{name: "Checkout.com", category: "ecommerce", confidence: "high",
		patterns: []string{"cdn.checkout.com", "api2.checkout.com", "Frames.init"}},
	{name: "Volusion", category: "ecommerce", confidence: "high",
		patterns: []string{"a.volusion.com", "volusion.com/"}},
	{name: "Ko-fi", category: "ecommerce", confidence: "high",
		patterns: []string{"ko-fi.com/kofiwidget", "storage.ko-fi.com"}},
	{name: "Buy Me a Coffee", category: "ecommerce", confidence: "high",
		patterns: []string{"buymeacoffee.com", "cdn.buymeacoffee.com", "bmc-btn"}},

	// Tag Management additions
	{name: "Tealium", category: "analytics", confidence: "high",
		patterns: []string{"tags.tiqcdn.com", "tealium.com/utag", "utag.js"}},
	{name: "Adobe Launch", category: "analytics", confidence: "high",
		patterns: []string{"assets.adobedtm.com", "satelliteLib-"}},

	// More A/B Testing
	{name: "LaunchDarkly", category: "analytics", confidence: "high",
		patterns: []string{"launchdarkly.com", "app.launchdarkly.com", "LDClient.initialize"}},
	{name: "Split.io", category: "analytics", confidence: "high",
		patterns: []string{"cdn.split.io", "sdk.split.io", "SplitFactory("}},
	{name: "Convert.com", category: "analytics", confidence: "high",
		patterns: []string{"d.convert.com", "convert.com/js/"}},
	{name: "Kameleoon", category: "analytics", confidence: "high",
		patterns: []string{"kameleoon.eu/kameleoon.js", "kameleoon.com/"}},

	// Customer Data Platforms
	{name: "mParticle", category: "analytics", confidence: "high",
		patterns: []string{"jssdkcdns.mparticle.com", "mparticle.com/sdk", "mParticle.init"}},
	{name: "BlueConic", category: "analytics", confidence: "high",
		patterns: []string{"blueconic.net", "bc.js", "bc.blueconic.net"}},

	// Font Services
	{name: "Google Fonts", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"fonts.googleapis.com", "fonts.gstatic.com"}},
	{name: "Adobe Fonts", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"use.typekit.net", "p.typekit.net", "typekit.com/fonts"}},
	{name: "Font Awesome", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"use.fontawesome.com", "kit.fontawesome.com", "fontawesome.com/js/"}},
	{name: "Bunny Fonts", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"fonts.bunny.net"}},
	{name: "Weglot", category: "analytics", confidence: "high",
		patterns: []string{"cdn.weglot.com", "weglot.initialize(", "weglot-switcher"}},

	// Scheduling / Booking
	{name: "Calendly", category: "analytics", confidence: "high",
		patterns: []string{"assets.calendly.com", "calendly.com/assets/external/widget.js", "Calendly.initPopupWidget"}},
	{name: "Cal.com", category: "analytics", confidence: "high",
		patterns: []string{"cal.com/embed", "app.cal.com/embed"}},
	{name: "Acuity Scheduling", category: "analytics", confidence: "high",
		patterns: []string{"acuityscheduling.com", "embed.acuityscheduling.com"}},

	// Pop-up / Lead Capture
	{name: "Privy", category: "analytics", confidence: "high",
		patterns: []string{"widget.privy.com", "static.privy.com", "privy.js"}},
	{name: "OptiMonk", category: "analytics", confidence: "high",
		patterns: []string{"cdn.optimonk.com", "optimonk.js", "optimonk.com/js"}},
	{name: "Wisepops", category: "analytics", confidence: "high",
		patterns: []string{"wisepops.com/js/", "wisepops.net"}},
	{name: "ConvertFlow", category: "analytics", confidence: "high",
		patterns: []string{"js.convertflow.com", "convertflow.co"}},
	{name: "Sumo", category: "analytics", confidence: "high",
		patterns: []string{"sumo.com/scripts/", "load.sumo.com", "sumo.li"}},
	{name: "Hello Bar", category: "analytics", confidence: "high",
		patterns: []string{"hellobar.com/hellobar.js", "hello-bar.js"}},

	// Social / Messaging Widgets
	{name: "WhatsApp Chat", category: "analytics", confidence: "high",
		tagOnly: true,
		patterns: []string{"wa.me/", "api.whatsapp.com/send", "whatsapp-chat"}},
	{name: "Facebook Messenger", category: "analytics", confidence: "high",
		patterns: []string{"connect.facebook.net/en_US/sdk.js", "fb-messenger-checkbox", "customerchat.js"}},

	// More Video
	{name: "Cloudflare Stream", category: "media", confidence: "high",
		patterns: []string{"cloudflarestream.com", "iframe.cloudflarestream.com", "stream.cloudflare.com"}},
	{name: "Kaltura", category: "media", confidence: "high",
		patterns: []string{"cdnapi.kaltura.com", "www.kaltura.com/index.php/kwidget", "kaltura.com/p/"}},
	{name: "Loom Embed", category: "media", confidence: "high",
		tagOnly: true,
		patterns: []string{"loom.com/embed", "www.loom.com/share"}},
	{name: "Podia", category: "media", confidence: "high",
		patterns: []string{"podia.com/embed", "embed.podia.com"}},

	// More Search
	{name: "Typesense", category: "analytics", confidence: "high",
		patterns: []string{"typesense.org", "typesense-instantsearch-adapter", "typesense.Client"}},
	{name: "Doofinder", category: "analytics", confidence: "high",
		patterns: []string{"doofindercdn.com", "doofinder.com/js/"}},

	// More Support / Chat
	{name: "Userlike", category: "analytics", confidence: "high",
		patterns: []string{"userlike.com/widget", "cdn.userlike.com"}},
	{name: "Re:amaze", category: "analytics", confidence: "high",
		patterns: []string{"reamaze.com", "reamaze.io/embed"}},
	{name: "Comm100", category: "analytics", confidence: "high",
		patterns: []string{"chatserver.comm100.com", "hosted.comm100.com"}},

	// SEO Plugins
	{name: "Yoast SEO", category: "analytics", confidence: "high",
		patterns: []string{"yoast.com/", "yoast-schema-graph", "wpseo-schema"}},
	{name: "RankMath", category: "analytics", confidence: "high",
		patterns: []string{"rank-math", "rankmath.com", "wp-rankmath-schema"}},

	// More Social Proof
	{name: "Proof", category: "analytics", confidence: "high",
		patterns: []string{"useproof.com", "proof.com/widget"}},
	{name: "Fomo", category: "analytics", confidence: "high",
		patterns: []string{"fomo.com/js/", "load.fomo.com"}},
	{name: "TrustIndex", category: "analytics", confidence: "high",
		patterns: []string{"cdn.trustindex.io", "trustindex.io/loader.js"}},

	// More CMS
	{name: "ConcreteCMS", category: "cms", confidence: "high",
		patterns: []string{"concrete/js/", "ccm_basedir", "concrete5.org", "/concrete/blocks/"}},
	{name: "ExpressionEngine", category: "cms", confidence: "high",
		patterns: []string{"exp:channel", "ee_session", "expressionengine.com"}},
	{name: "DotCMS", category: "cms", confidence: "high",
		patterns: []string{"dotcms.com", "/dA/", "dotcms-edit"}},

	// More Builders
	{name: "SeedProd", category: "builder", confidence: "high",
		patterns: []string{"seedprod.com", "seedprod-", "seedprodbuildertmp"}},
	{name: "Landen", category: "builder", confidence: "high",
		patterns: []string{"landen.co", "cdn.landen.co"}},

	// More Forms
	{name: "WPForms", category: "analytics", confidence: "high",
		patterns: []string{"wpforms-form", "wpforms.com/", "wpforms-field"}},
	{name: "Ninja Forms", category: "analytics", confidence: "high",
		tagOnly: true,
		patterns: []string{"ninja-forms", "nf-form", "ninjaforms.com"}},
	{name: "Formidable Forms", category: "analytics", confidence: "high",
		patterns: []string{"formidable-form", "frm_forms", "formidableforms.com"}},
	{name: "Formstack", category: "analytics", confidence: "high",
		patterns: []string{"formstack.com/forms", "fsForm", "cdn.formstack.com"}},
	{name: "Cognito Forms", category: "analytics", confidence: "high",
		patterns: []string{"cognitoforms.com", "d3q7b97an5b4mc.cloudfront.net"}},
	{name: "Paperform", category: "analytics", confidence: "high",
		patterns: []string{"paperform.co", "paperform-embed"}},

	// More Email Marketing
	{name: "Substack", category: "analytics", confidence: "high",
		patterns: []string{"substackcdn.com", "substack.com/embed"}},
	{name: "Flodesk", category: "analytics", confidence: "high",
		patterns: []string{"flodesk.com/js/", "assets.flodesk.com"}},
	{name: "GetResponse", category: "analytics", confidence: "high",
		patterns: []string{"gr-cdn.com", "grwebform", "getresponse.com/view"}},
	{name: "AWeber", category: "analytics", confidence: "high",
		patterns: []string{"aweber.com/form/", "forms.aweber.com"}},
	{name: "Constant Contact", category: "analytics", confidence: "high",
		patterns: []string{"constantcontact.com", "r20.rs6.net", "constantcontactpages.com"}},

	// Accessibility additions
	{name: "EqualWeb", category: "analytics", confidence: "high",
		patterns: []string{"equalweb.com", "cdn.equalweb.com", "EqualWebAccessibility"}},

	// Push Notifications additions
	{name: "Pushwoosh", category: "analytics", confidence: "high",
		patterns: []string{"cdn.pushwoosh.com", "pushwoosh.init(", "pushwoosh.com/js/"}},

	// More Reviews / Social
	{name: "Bazaarvoice", category: "analytics", confidence: "high",
		patterns: []string{"bazaarvoice.com", "display.ugc.bazaarvoice.com", "bvdisplay"}},
	{name: "PowerReviews", category: "analytics", confidence: "high",
		patterns: []string{"powerreviews.com", "assets.powerreviews.com"}},

	// More Payments
	{name: "GoCardless", category: "ecommerce", confidence: "high",
		patterns: []string{"pay.gocardless.com", "api.gocardless.com", "GoCardless.setup"}},
	{name: "Cashfree", category: "ecommerce", confidence: "high",
		patterns: []string{"sdk.cashfree.com", "cashfree.com/checkout"}},

	// More Maps
	{name: "Cesium", category: "media", confidence: "high",
		tagOnly: true,
		patterns: []string{"cesium.com/downloads/cesiumjs", "cesium.js", "Cesium.Viewer"}},

	// More Video
	{name: "Flowplayer", category: "media", confidence: "high",
		patterns: []string{"flowplayer.org", "flowplayer.js", "flowplayer.min.js"}},

	// More JS Frameworks
	{name: "Backbone.js", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"backbone.min.js", "backbone@", "backbone-min.js"}},
	{name: "Webpack", category: "framework", confidence: "high",
		patterns: []string{"__webpack_require__", "webpackChunk", "webpack/runtime"}},
	{name: "Stimulus", category: "framework", confidence: "high",
		patterns: []string{"@hotwired/stimulus", "stimulus.js", "stimulus-controller"}},
	{name: "Lodash", category: "framework", confidence: "high",
		tagOnly: true,
		patterns: []string{"lodash.min.js", "lodash@", "cdn.jsdelivr.net/npm/lodash"}},

	// More CDN
	{name: "Supabase CDN", category: "cdn", confidence: "high",
		patterns: []string{"supabase.co/functions/"}},
	{name: "StackPath", category: "cdn", confidence: "high",
		patterns: []string{"stackpathcdn.com", "stackpath.com/"}},

	// Monitoring / Observability
	{name: "OpenTelemetry", category: "analytics", confidence: "high",
		patterns: []string{"opentelemetry-js", "@opentelemetry/", "opentelemetry.io"}},

	// More Developer Tools visible in HTML
	{name: "Nx", category: "framework", confidence: "high",
		patterns: []string{"nx.dev", "__NX_", "nrwl/nx"}},
	{name: "Storybook", category: "framework", confidence: "high",
		patterns: []string{"storybook.js.org", "sb-show-main", "storybook-root"}},
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

// Matches HTML comments and <noscript> bodies. Both commonly contain stale
// framework mentions ("migrated from WordPress", noscript analytics fallbacks)
// that otherwise produce false detections.
var (
	htmlCommentRe = regexp.MustCompile(`<!--[\s\S]*?-->`)
	noscriptRe    = regexp.MustCompile(`(?i)<noscript[\s\S]*?</noscript>`)
)

// stripNoisyHTML removes content that should never count as detection
// evidence: HTML comments and <noscript> fallback blocks.
func stripNoisyHTML(rawHTML string) string {
	cleaned := htmlCommentRe.ReplaceAllString(rawHTML, "")
	return noscriptRe.ReplaceAllString(cleaned, "")
}

// headerTechSignal maps a response-header substring to a technology. Headers
// are explicit, first-party evidence set by the serving infrastructure — the
// most reliable signal class available.
type headerTechSignal struct {
	match    string // lowercased substring to find in any mapped header value
	name     string
	category string
}

var headerTechSignals = []headerTechSignal{
	{match: "php", name: "PHP", category: "framework"},
	{match: "express", name: "Express.js", category: "framework"},
	{match: "next.js", name: "Next.js", category: "framework"},
	{match: "asp.net", name: "ASP.NET", category: "framework"},
	{match: "cloudflare", name: "Cloudflare", category: "cdn"},
	{match: "vercel", name: "Vercel", category: "cdn"},
	{match: "netlify", name: "Netlify", category: "cdn"},
	{match: "drupal", name: "Drupal", category: "cms"},
	{match: "wix", name: "Wix", category: "builder"},
	{match: "squarespace", name: "Squarespace", category: "builder"},
	{match: "nginx", name: "Nginx", category: "framework"},
	{match: "apache", name: "Apache", category: "framework"},
}

// detectHeaderTech derives high-confidence items from HTTP response headers.
func detectHeaderTech(headers http.Header) []model.TechItem {
	if len(headers) == 0 {
		return nil
	}
	type headerHit struct {
		value    string
		category string
	}
	found := map[string]headerHit{}

	scan := func(value string) {
		lv := strings.ToLower(value)
		for _, sig := range headerTechSignals {
			if strings.Contains(lv, sig.match) {
				prev, exists := found[sig.name]
				if !exists || len(value) < len(prev.value) {
					found[sig.name] = headerHit{value: strings.TrimSpace(value), category: sig.category}
				}
			}
		}
	}
	for _, key := range []string{"X-Powered-By", "Server", "X-Generator"} {
		for _, v := range headers.Values(key) {
			scan(v)
		}
	}
	// Vercel identifies via a dedicated header rather than `Server`.
	if len(headers.Values("X-Vercel-Id")) > 0 {
		found["Vercel"] = headerHit{value: "x-vercel-id", category: "cdn"}
	}

	names := make([]string, 0, len(found))
	for name := range found {
		names = append(names, name)
	}
	sort.Strings(names)

	items := make([]model.TechItem, 0, len(found))
	for _, name := range names {
		h := found[name]
		items = append(items, model.TechItem{
			Name:       name,
			Category:   h.category,
			Confidence: "high",
			Score:      95,
			RuleID:     "http-header",
			Signals: []model.TechSignal{{
				Pattern:      "response header",
				Match:        truncateHeaderValue(h.value),
				EvidenceType: "explicit",
				Source:       "first-party",
			}},
		})
	}
	return items
}

func truncateHeaderValue(v string) string {
	if len(v) > 60 {
		return v[:60]
	}
	return v
}

// detectTech performs substring matching and maps an internal 0-100 score to
// a confidence label (high/medium/low) for each detected technology.
// headers is optional; explicit server signals are merged with HTML evidence.
func detectTech(rawHTML string, sourceURL string, headers http.Header) []model.TechItem {
	cleaned := stripNoisyHTML(rawHTML)
	lower := strings.ToLower(cleaned)
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

	// Merge explicit HTTP-header evidence: new names are appended, existing
	// names gain the corroborating signal (and upgrade to the header's score,
	// since headers are set by the serving infrastructure itself).
	for _, h := range detectHeaderTech(headers) {
		idx := -1
		for i := range found {
			if strings.EqualFold(found[i].Name, h.Name) {
				idx = i
				break
			}
		}
		if idx == -1 {
			found = append(found, h)
			continue
		}
		h.Signals = append(found[idx].Signals, h.Signals...)
		if h.Score > found[idx].Score {
			found[idx] = h
		}
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

	// Enforce declared confidence ceiling so that a "medium" pattern never
	// accidentally scores into "high" territory just because it matched many signals.
	if p.confidence == "medium" && score > 69 {
		score = 69
	}
	if p.confidence == "low" && score > 39 {
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

	// Minified file names are definitive (bootstrap.min.css, jquery.min.js, etc.)
	if strings.Contains(p, ".min.js") || strings.Contains(p, ".min.css") || strings.Contains(p, ".bundle.js") {
		return true
	}

	// Vendor domain or subdomain — explicit fingerprint even without a URL path.
	// e.g. "static.klaviyo.com", "cloudfront.net", "akamaihd.net"
	for _, suffix := range []string{".com", ".net", ".io", ".app", ".dev", ".co", ".org"} {
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
	runes := []rune(snippet)
	if len(runes) > span {
		runes = runes[:span]
	}
	return string(runes)
}

// onlyTags returns just the HTML tag content (without text nodes) to support
// tag-only matching for ambiguous patterns. Script bodies, style blocks, and
// comments are skipped so `<`/`>` inside code never masquerade as tag markup.
func onlyTags(lowerHTML string) string {
	var b strings.Builder
	b.Grow(len(lowerHTML))

	const (
		modeNormal = iota
		modeTag
		modeScript
		modeStyle
		modeComment
	)
	mode := modeNormal

	skipThroughGt := func(i int) int {
		// Advance past the next '>', returning the index of that byte.
		if end := strings.IndexByte(lowerHTML[i:], '>'); end != -1 {
			return i + end
		}
		return len(lowerHTML) - 1
	}

	for i := 0; i < len(lowerHTML); i++ {
		c := lowerHTML[i]
		switch mode {
		case modeNormal:
			if c != '<' {
				// Text nodes are excluded — this function returns tag content only.
				continue
			}
			rest := lowerHTML[i:]
			switch {
			case strings.HasPrefix(rest, "<script"):
				mode = modeScript
				i = skipThroughGt(i)
			case strings.HasPrefix(rest, "<style"):
				mode = modeStyle
				i = skipThroughGt(i)
			case strings.HasPrefix(rest, "<!--"):
				mode = modeComment
				i += 3
			default:
				mode = modeTag
			}
			b.WriteByte(' ')
		case modeTag:
			if c == '>' {
				mode = modeNormal
			} else {
				b.WriteByte(c)
			}
		case modeScript:
			if strings.HasPrefix(lowerHTML[i:], "</script") {
				i = skipThroughGt(i)
				mode = modeNormal
			}
		case modeStyle:
			if strings.HasPrefix(lowerHTML[i:], "</style") {
				i = skipThroughGt(i)
				mode = modeNormal
			}
		case modeComment:
			if strings.HasPrefix(lowerHTML[i:], "-->") {
				i += 2
				mode = modeNormal
			}
		}
	}
	return b.String()
}
